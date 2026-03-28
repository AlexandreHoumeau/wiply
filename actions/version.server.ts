"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/validators/project";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Une erreur inattendue est survenue";
}

export type ProjectVersion = {
    id: string;
    project_id: string;
    agency_id: string;
    name: string;
    status: "open" | "released";
    released_at: string | null;
    created_at: string;
    updated_at: string;
};

export async function getProjectVersions(
    projectId: string
): Promise<ActionResult<ProjectVersion[]>> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("project_versions")
            .select("*")
            .eq("project_id", projectId)
            .order("status", { ascending: true }) // 'open' before 'released'
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as ProjectVersion[] };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function createVersion(
    projectId: string,
    agencyId: string,
    name: string
): Promise<ActionResult<ProjectVersion>> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("project_versions")
            .insert({ project_id: projectId, agency_id: agencyId, name: name.trim(), status: "open" })
            .select()
            .single();

        if (error) throw error;
        revalidatePath(`/app/projects`);
        return { success: true, data: data as ProjectVersion };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function releaseVersion(versionId: string): Promise<ActionResult<void>> {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from("project_versions")
            .update({ status: "released", released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", versionId);

        if (error) throw error;
        revalidatePath(`/app/projects`);
        return { success: true, data: undefined };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteVersion(versionId: string): Promise<ActionResult<void>> {
    const supabase = await createClient();
    try {
        // Unlink tasks first
        await supabase.from("tasks").update({ version_id: null }).eq("version_id", versionId);

        const { error } = await supabase
            .from("project_versions")
            .delete()
            .eq("id", versionId);

        if (error) throw error;
        revalidatePath(`/app/projects`);
        return { success: true, data: undefined };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}
