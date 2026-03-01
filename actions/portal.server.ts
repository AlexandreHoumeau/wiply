"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    } catch (error: any) {
        return { success: false, error: error.message };
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
            .select("id, is_portal_active")
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
            const fileName = `${crypto.randomUUID()}-${Date.now()}.${fileExt}`;

            // Upload dans le bucket qu'on vient de créer
            const { error: uploadError } = await supabaseAdmin.storage
                .from("portal_uploads")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Récupérer l'URL publique
            const { data: publicUrlData } = supabaseAdmin.storage
                .from("portal_uploads")
                .getPublicUrl(fileName);

            fileUrl = publicUrlData.publicUrl;
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

        return { success: true };
    } catch (error: any) {
        console.error("Erreur upload:", error);
        return { success: false, error: error.message };
    }
}