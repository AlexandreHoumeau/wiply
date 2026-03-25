"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkFilesEnabled, checkStorageLimit } from "@/lib/billing/checkLimit";
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
    uploader: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
    task_files?: { task_id: string; task: { task_number: number; title: string; project: { slug: string; task_prefix: string } } }[];
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
        const { supabase } = await getAuthContext();
        const { data, error } = await supabase
            .from("files")
            .select(`
                *,
                uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email),
                task_files(task_id, task:tasks!task_files_task_id_fkey(task_number, title, project:projects!tasks_project_id_fkey(slug, task_prefix)))
            `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getTaskFiles(taskId: string): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase } = await getAuthContext();
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

        // Agency-wide links cannot be linked to tasks
        if (projectId === null && taskId) {
            return { success: false, error: "Les fichiers globaux ne peuvent pas être liés à un ticket" };
        }

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

        // Verify file is project-scoped and matches task's project
        if (!file.project_id) return { success: false, error: "Les fichiers globaux ne peuvent pas être liés à un ticket" };

        const { data: task } = await supabase.from("tasks").select("project_id").eq("id", taskId).single();
        if (!task || task.project_id !== file.project_id) {
            return { success: false, error: "Ce fichier n'appartient pas au même projet que ce ticket" };
        }

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

        // Delete storage object first (if upload)
        if (file.type === "upload" && file.storage_path) {
            const { error: storageError } = await supabaseAdmin.storage
                .from("agency-files")
                .remove([file.storage_path]);
            if (storageError) throw storageError;
        }

        const { error } = await supabase.from("files").delete().eq("id", fileId);
        if (error) throw error;

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
