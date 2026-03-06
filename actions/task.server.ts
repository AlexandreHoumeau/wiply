"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

export async function getProjectTasks(projectId: string) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("tasks")
            .select(`
                *,
                assignee:profiles!tasks_assignee_id_fkey(*),
                creator:profiles!tasks_created_by_fkey(*),
                task_comments(count)
                `)
            .eq("project_id", projectId)
            .order("position", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("Erreur fetch tasks:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTaskStatusAndPosition(
    taskId: string,
    newStatus: string,
    newPosition: number,
    // Optionnel : si tu veux réordonner les autres tâches en DB
) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("tasks")
            .update({
                status: newStatus,
                position: newPosition,
                updated_at: new Date().toISOString()
            })
            .eq("id", taskId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Erreur update task:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteTask(taskId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Erreur suppression tâche:", error);
        return { success: false, error: error.message };
    }
}

// ─── Comments ──────────────────────────────────────────────────────────────

export type TaskComment = {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
    } | null;
};

export async function getTaskComments(taskId: string): Promise<{ success: boolean; data?: TaskComment[]; error?: string }> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("task_comments")
            .select(`
                *,
                author:profiles!task_comments_user_id_fkey(id, first_name, last_name, email)
            `)
            .eq("task_id", taskId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return { success: true, data: (data ?? []) as TaskComment[] };
    } catch (error: any) {
        console.error("Erreur fetch comments:", error);
        return { success: false, error: error.message };
    }
}

export async function addTaskComment(taskId: string, content: string): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
    const supabase = await createClient();
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Non authentifié" };

        const { data, error } = await supabase
            .from("task_comments")
            .insert({ task_id: taskId, user_id: user.id, content: content.trim() })
            .select(`*, author:profiles!task_comments_user_id_fkey(id, first_name, last_name, email)`)
            .single();

        if (error) throw error;

        // Notify task creator and assignee (excluding the commenter)
        const { data: task } = await supabase
            .from("tasks")
            .select("created_by, assignee_id, title, agency_id")
            .eq("id", taskId)
            .single();

        if (task) {
            const recipients = [task.created_by, task.assignee_id]
                .filter(Boolean)
                .filter((id, i, arr) => arr.indexOf(id) === i)
                .filter((id) => id !== user.id);

            for (const recipientId of recipients) {
                await createNotification({
                    agencyId: task.agency_id,
                    userId: recipientId,
                    type: "task_comment",
                    title: "Nouveau commentaire",
                    body: `Commentaire sur la tâche "${task.title}"`,
                    metadata: { task_id: taskId },
                });
            }
        }

        return { success: true, data: data as TaskComment };
    } catch (error: any) {
        console.error("Erreur ajout commentaire:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteTaskComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Non authentifié" };

        const { error } = await supabase
            .from("task_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", user.id); // only own comments

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Erreur suppression commentaire:", error);
        return { success: false, error: error.message };
    }
}