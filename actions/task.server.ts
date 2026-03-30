"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Une erreur inattendue est survenue";
}

type TaskNotificationProject = {
    slug: string | null;
    task_prefix: string | null;
};

type TaskNotificationTarget = {
    created_by: string | null;
    assignee_id: string | null;
    title: string;
    agency_id: string;
    task_number: number | null;
    project: TaskNotificationProject | null;
};

export async function getProjectTasks(projectId: string) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("tasks")
            .select(`
                *,
                assignee:profiles!tasks_assignee_id_fkey(*),
                creator:profiles!tasks_created_by_fkey(*),
                task_comments(count),
                version:project_versions(id, name, status)
                `)
            .eq("project_id", projectId)
            .order("position", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        console.error("Erreur fetch tasks:", error);
        return { success: false, error: getErrorMessage(error) };
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
    } catch (error: unknown) {
        console.error("Erreur update task:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteTask(taskId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) throw error;
        return { success: true };
    } catch (error: unknown) {
        console.error("Erreur suppression tâche:", error);
        return { success: false, error: getErrorMessage(error) };
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
    } catch (error: unknown) {
        console.error("Erreur fetch comments:", error);
        return { success: false, error: getErrorMessage(error) };
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
        const { data: taskData } = await supabase
            .from("tasks")
            .select("created_by, assignee_id, title, agency_id, task_number, project:projects!tasks_project_id_fkey(slug, task_prefix)")
            .eq("id", taskId)
            .single();

        const task = taskData as TaskNotificationTarget | null;

        if (task) {
            // Extract @mention user IDs from HTML content (data-id attributes)
            const mentionedIds = [...content.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);

            const commentRecipients = [task.created_by, task.assignee_id]
                .filter((id): id is string => Boolean(id))
                .filter((id, i, arr) => arr.indexOf(id) === i)
                .filter((id) => id !== user.id);

            for (const recipientId of commentRecipients) {
                await createNotification({
                    agencyId: task.agency_id,
                    userId: recipientId,
                    type: "task_comment",
                        title: "Nouveau commentaire",
                        body: `Commentaire sur la tâche "${task.title}"`,
                        metadata: {
                            task_id: taskId,
                            project_slug: task.project?.slug ?? null,
                            task_number: task.task_number,
                            task_prefix: task.project?.task_prefix ?? null,
                        },
                    });
                }

            // Notify mentioned users (excluding those already notified above, and the commenter)
            const alreadyNotified = new Set([user.id, ...commentRecipients]);
            for (const mentionedId of mentionedIds) {
                if (!alreadyNotified.has(mentionedId)) {
                    alreadyNotified.add(mentionedId);
                    await createNotification({
                        agencyId: task.agency_id,
                        userId: mentionedId,
                        type: "task_comment",
                        title: "Vous avez été mentionné",
                        body: `Vous avez été mentionné dans un commentaire sur "${task.title}"`,
                        metadata: {
                            task_id: taskId,
                            project_slug: task.project?.slug ?? null,
                            task_number: task.task_number,
                            task_prefix: task.project?.task_prefix ?? null,
                        },
                    });
                }
            }
        }

        return { success: true, data: data as TaskComment };
    } catch (error: unknown) {
        console.error("Erreur ajout commentaire:", error);
        return { success: false, error: getErrorMessage(error) };
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
    } catch (error: unknown) {
        console.error("Erreur suppression commentaire:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}
