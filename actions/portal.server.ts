"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Une erreur inattendue s'est produite";
}

function isAbsoluteUrl(value: string | null | undefined): value is string {
    return typeof value === "string" && /^https?:\/\//.test(value);
}

async function createPortalSignedUrl(pathOrUrl: string): Promise<string> {
    if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;

    const { data, error } = await supabaseAdmin.storage
        .from("portal_uploads")
        .createSignedUrl(pathOrUrl, 3600);

    if (error) throw error;
    return data.signedUrl;
}

export async function getPortalData(magicToken: string) {
    try {
        // On ajoute "agency:agencies(name)" pour récupérer le nom de l'agence !
        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select(`
                id, name, description, figma_url, deployment_url, is_portal_active,
                portal_message, portal_show_progress,
                company:companies(name),
                agency:agencies(name, logo_url, primary_color, secondary_color)
            `)
            .eq("magic_token", magicToken)
            .single();

        if (projectError || !project) return { success: false, error: "Projet introuvable" };

        if (project.is_portal_active === false) {
            return { success: false, error: "L'accès à ce portail a été suspendu par l'agence." };
        }

        const { data: checklists } = await supabaseAdmin
            .from("project_checklists")
            .select("*")
            .eq("project_id", project.id)
            .order("created_at", { ascending: true });

        return { success: true, project, checklists: checklists || [] };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
    image: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
    file: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed",
    ],
    text: [],
};

export async function submitClientContent(magicToken: string, itemId: string, formData: FormData) {
    try {
        // Resolve project from token and verify portal is active
        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select("id, is_portal_active, agency_id, slug")
            .eq("magic_token", magicToken)
            .single();

        if (projectError || !project) return { success: false, error: "Lien invalide." };
        if (!project.is_portal_active) return { success: false, error: "Ce portail a été suspendu." };

        // Verify the checklist item belongs to this project and hasn't been submitted yet
        const { data: item, error: itemError } = await supabaseAdmin
            .from("project_checklists")
            .select("project_id, status")
            .eq("id", itemId)
            .single();

        if (itemError || !item || item.project_id !== project.id) {
            return { success: false, error: "Accès non autorisé." };
        }
        if (item.status === 'uploaded') {
            return { success: false, error: "Cet élément a déjà été fourni." };
        }

        const textContent = formData.get("content") as string;
        const file = formData.get("file") as File;
        const expectedType = formData.get("expected_type") as string;

        const MAX_TEXT_LENGTH = 10_000;
        if (textContent && textContent.length > MAX_TEXT_LENGTH) {
            return { success: false, error: "Texte trop long (max 10 000 caractères)." };
        }

        let fileUrl = null;
        let finalResponse = textContent || "";

        // Si le client a uploadé un fichier
        if (file && file.size > 0) {
            // Server-side file size check
            if (file.size > MAX_FILE_SIZE) {
                return { success: false, error: "Fichier trop volumineux (max 5 Mo)." };
            }

            // Server-side MIME type validation
            const allowedTypes = ALLOWED_MIME_TYPES[expectedType] ?? [];
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
                return { success: false, error: "Type de fichier non autorisé." };
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}/${itemId}/${crypto.randomUUID()}-${Date.now()}.${fileExt ?? "bin"}`;

            // Upload dans le bucket qu'on vient de créer
            const { error: uploadError } = await supabaseAdmin.storage
                .from("portal_uploads")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            fileUrl = fileName;
            finalResponse = file.name; // On sauvegarde le nom du fichier comme texte
        }

        // Mise à jour de la base de données
        const { error } = await supabaseAdmin
            .from("project_checklists")
            .update({
                client_response: finalResponse,
                file_url: fileUrl,
                status: 'uploaded',
                updated_at: new Date().toISOString()
            })
            .eq("id", itemId);

        if (error) throw error;

        // Notify agency members who opted in (fire-and-forget)
        supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("agency_id", project.agency_id)
            .eq("notify_portal_submission", true)
            .then(({ data: members }) => {
                if (!members?.length) return;
                for (const member of members) {
                    createNotification({
                        agencyId: project.agency_id,
                        userId: member.id,
                        type: "portal_submission",
                        title: "Livrable reçu",
                        body: `Un client a soumis un élément via le portail`,
                        metadata: { project_id: project.id, project_slug: project.slug, checklist_item_id: itemId },
                    });
                }
            });

        return { success: true };
    } catch (error: unknown) {
        console.error("Erreur upload:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getPortalUploadUrl(magicToken: string, itemId: string) {
    try {
        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select("id, is_portal_active")
            .eq("magic_token", magicToken)
            .single();

        if (projectError || !project) return { success: false, error: "Lien invalide." };
        if (!project.is_portal_active) return { success: false, error: "Ce portail a été suspendu." };

        const { data: item, error: itemError } = await supabaseAdmin
            .from("project_checklists")
            .select("project_id, file_url")
            .eq("id", itemId)
            .single();

        if (itemError || !item || item.project_id !== project.id || !item.file_url) {
            return { success: false, error: "Fichier introuvable." };
        }

        const url = await createPortalSignedUrl(item.file_url);
        return { success: true, url };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getAgencyPortalUploadUrl(itemId: string) {
    try {
        const appSupabase = await createClient();
        const { data: { user }, error: authError } = await appSupabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Non authentifié" };

        const { data: profile } = await appSupabase
            .from("profiles")
            .select("agency_id")
            .eq("id", user.id)
            .single();

        if (!profile?.agency_id) return { success: false, error: "Agence introuvable" };

        const { data: item, error: itemError } = await supabaseAdmin
            .from("project_checklists")
            .select("file_url, project:projects!project_checklists_project_id_fkey(agency_id)")
            .eq("id", itemId)
            .single();

        const projectAgencyId = Array.isArray(item?.project) ? item.project[0]?.agency_id : item?.project?.agency_id;
        if (itemError || !item?.file_url || projectAgencyId !== profile.agency_id) {
            return { success: false, error: "Fichier introuvable" };
        }

        const url = await createPortalSignedUrl(item.file_url);
        return { success: true, url };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}
