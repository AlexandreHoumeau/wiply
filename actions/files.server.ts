"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkFilesEnabled, checkStorageLimit, getUsedStorageBytes } from "@/lib/billing/checkLimit";
import { PLANS } from "@/lib/config/plans";
import { z } from "zod";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Non authentifié");

    const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

    if (!profile?.agency_id) throw new Error("Agence introuvable");
    return { supabase, userId: user.id, agencyId: profile.agency_id as string };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type FileRecord = {
    id: string;
    agency_id: string;
    project_id: string | null;
    type: "upload" | "link";
    name: string;
    storage_path: string | null;
    url: string | null;
    size: number | null;
    mime_type: string | null;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
    folder_id: string | null;
    uploader: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
    task_files?: { task_id: string; task: { task_number: number; title: string; project: { slug: string; task_prefix: string } } }[];
};

export type FolderRecord = {
    id: string;
    agency_id: string;
    name: string;
    created_at: string;
};

// ─── Read actions ────────────────────────────────────────────────────────────

export async function getAgencyFiles(): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("files")
            .select(`
                *,
                uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email),
                task_files(task_id, task:tasks!task_files_task_id_fkey(task_number, title, project:projects!tasks_project_id_fkey(slug, task_prefix)))
            `)
            .eq("agency_id", agencyId)
            .is("project_id", null)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getProjectFiles(projectId: string): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("files")
            .select(`
                *,
                uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email),
                task_files(task_id, task:tasks!task_files_task_id_fkey(task_number, title, project:projects!tasks_project_id_fkey(slug, task_prefix)))
            `)
            .eq("project_id", projectId)
            .eq("agency_id", agencyId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getTaskFiles(taskId: string): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        // Verify the task belongs to this agency
        const { data: task } = await supabase.from("tasks").select("agency_id").eq("id", taskId).single();
        if (!task || task.agency_id !== agencyId) return { success: true, data: [] };

        const { data, error } = await supabase
            .from("task_files")
            .select(`
                file:files!task_files_file_id_fkey(
                    *,
                    uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)
                )
            `)
            .eq("task_id", taskId);

        if (error) throw error;
        const files = (data ?? []).map((row: any) => row.file).filter(Boolean);
        return { success: true, data: files as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getStorageUsage(): Promise<{ success: boolean; data?: { usedBytes: number; limitBytes: number }; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const usedBytes = await getUsedStorageBytes(agencyId);
        // getAgencyPlan is private in checkLimit.ts — inline the 3-line plan resolution here.
        const { data } = await supabase.from("agencies").select("plan, demo_ends_at").eq("id", agencyId).single();
        const plan = (data?.demo_ends_at && new Date(data.demo_ends_at) > new Date()) ? "PRO" : ((data?.plan as keyof typeof PLANS) || "FREE");
        const limitBytes = PLANS[plan].max_storage_bytes;
        return { success: true, data: { usedBytes, limitBytes } };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData): Promise<{ success: boolean; data?: FileRecord; error?: string }> {
    try {
        const { supabase, userId, agencyId } = await getAuthContext();

        const file = formData.get("file") as File | null;
        const projectId = formData.get("projectId") as string | null || null;
        const taskId = formData.get("taskId") as string | null || null;

        if (!file) return { success: false, error: "Aucun fichier fourni" };

        const filesCheck = await checkFilesEnabled(agencyId);
        if (!filesCheck.allowed) return { success: false, error: filesCheck.reason };

        const storageCheck = await checkStorageLimit(agencyId, file.size);
        if (!storageCheck.allowed) return { success: false, error: storageCheck.reason };

        // Generate a stable file ID for the storage path
        const fileId = crypto.randomUUID();
        const storagePath = projectId
            ? `${agencyId}/${projectId}/${fileId}`
            : `${agencyId}/workspace/${fileId}`;

        const bytes = await file.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
            .from("agency-files")
            .upload(storagePath, bytes, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: fileRow, error: insertError } = await supabase
            .from("files")
            .insert({
                id: fileId,
                agency_id: agencyId,
                project_id: projectId,
                type: "upload",
                name: file.name,
                storage_path: storagePath,
                url: null,
                size: file.size,
                mime_type: file.type || null,
                uploaded_by: userId,
            })
            .select(`*, uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)`)
            .single();

        if (insertError) {
            // Rollback storage upload
            await supabaseAdmin.storage.from("agency-files").remove([storagePath]);
            throw insertError;
        }

        if (taskId) {
            await supabase.from("task_files").insert({ task_id: taskId, file_id: fileId, linked_by: userId });
        }

        return { success: true, data: fileRow as FileRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Add external link ───────────────────────────────────────────────────────

const AddLinkSchema = z.object({
    projectId: z.string().uuid().nullable(),
    name: z.string().min(1).max(255),
    url: z.string().url(),
    taskId: z.string().uuid().optional(),
});

export async function addLink(
    projectId: string | null,
    name: string,
    url: string,
    taskId?: string
): Promise<{ success: boolean; data?: FileRecord; error?: string }> {
    try {
        const parsed = AddLinkSchema.safeParse({ projectId, name, url, taskId });
        if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

        const { supabase, userId, agencyId } = await getAuthContext();

        const filesCheck = await checkFilesEnabled(agencyId);
        if (!filesCheck.allowed) return { success: false, error: filesCheck.reason };

        const { data: fileRow, error } = await supabase
            .from("files")
            .insert({
                agency_id: agencyId,
                project_id: projectId,
                type: "link",
                name,
                url,
                storage_path: null,
                size: null,
                mime_type: null,
                uploaded_by: userId,
            })
            .select(`*, uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)`)
            .single();

        if (error) throw error;

        if (taskId) {
            await supabase.from("task_files").insert({ task_id: taskId, file_id: fileRow.id, linked_by: userId });
        }

        return { success: true, data: fileRow as FileRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Link / Unlink ───────────────────────────────────────────────────────────

export async function linkFileToTask(taskId: string, fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, userId, agencyId } = await getAuthContext();

        // Verify the file belongs to this agency
        const { data: file } = await supabase.from("files").select("agency_id, project_id").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };

        const { error } = await supabase.from("task_files").insert({ task_id: taskId, file_id: fileId, linked_by: userId });
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function unlinkFileFromTask(taskId: string, fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        // Verify the task belongs to this agency
        const { data: task } = await supabase.from("tasks").select("agency_id").eq("id", taskId).single();
        if (!task || task.agency_id !== agencyId) return { success: false, error: "Ticket introuvable" };

        const { error } = await supabase.from("task_files").delete().eq("task_id", taskId).eq("file_id", fileId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        const { data: file } = await supabase.from("files").select("agency_id, type, storage_path").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };

        // Delete DB row first (cascades task_files)
        const { error } = await supabase.from("files").delete().eq("id", fileId);
        if (error) throw error;

        // Delete Storage object after DB commit (if upload)
        // A dangling blob is recoverable; a dangling DB row pointing to a missing blob is not.
        if (file.type === "upload" && file.storage_path) {
            await supabaseAdmin.storage.from("agency-files").remove([file.storage_path]);
            // Storage deletion errors are intentionally swallowed — blob cleanup failure
            // doesn't affect user-visible state since the DB row is already gone.
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Signed URL ──────────────────────────────────────────────────────────────

export async function getSignedUrl(storagePath: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        const { data: file } = await supabase
            .from("files")
            .select("agency_id, type")
            .eq("storage_path", storagePath)
            .eq("agency_id", agencyId)
            .single();

        if (!file) return { success: false, error: "Fichier introuvable" };
        if (file.type === "link") return { success: false, error: "Ce fichier n'a pas de chemin de stockage" };

        const { data, error } = await supabaseAdmin.storage
            .from("agency-files")
            .createSignedUrl(storagePath, 3600); // 1 hour

        if (error) throw error;
        return { success: true, url: data.signedUrl };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function getFolders(): Promise<{ success: boolean; data?: FolderRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("folders")
            .select("*")
            .eq("agency_id", agencyId)
            .order("name", { ascending: true });
        if (error) throw error;
        return { success: true, data: (data ?? []) as FolderRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createFolder(name: string): Promise<{ success: boolean; data?: FolderRecord; error?: string }> {
    try {
        const trimmed = name.trim();
        if (!trimmed) return { success: false, error: "Le nom du dossier ne peut pas être vide" };
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("folders")
            .insert({ agency_id: agencyId, name: trimmed })
            .select("*")
            .single();
        if (error) throw error;
        return { success: true, data: data as FolderRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function renameFolder(folderId: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
        const trimmed = name.trim();
        if (!trimmed) return { success: false, error: "Le nom du dossier ne peut pas être vide" };
        const { supabase, agencyId } = await getAuthContext();
        const { data: folder } = await supabase.from("folders").select("agency_id").eq("id", folderId).single();
        if (!folder || folder.agency_id !== agencyId) return { success: false, error: "Dossier introuvable" };
        const { error } = await supabase.from("folders").update({ name: trimmed }).eq("id", folderId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data: folder } = await supabase.from("folders").select("agency_id").eq("id", folderId).single();
        if (!folder || folder.agency_id !== agencyId) return { success: false, error: "Dossier introuvable" };
        // Files with folder_id = folderId are automatically set to NULL by the FK constraint on delete.
        const { error } = await supabase.from("folders").delete().eq("id", folderId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function moveFileToFolder(fileId: string, folderId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data: file } = await supabase.from("files").select("agency_id, project_id").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };
        if (file.project_id !== null) return { success: false, error: "Impossible de déplacer un fichier lié à un projet dans un dossier" };
        const { error } = await supabase.from("files").update({ folder_id: folderId }).eq("id", fileId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
