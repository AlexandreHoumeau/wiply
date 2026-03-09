"use server";

import { createClient } from "@/lib/supabase/server";
import { checkProjectLimit } from "@/lib/billing/checkLimit";
import { revalidatePath } from "next/cache";
import { getPostHogClient } from "@/lib/posthog-server";
import type {
  ActionResult,
  ChecklistItemData,
  NewProjectFormValues,
  OpportunityForProject,
  ProjectFromOpportunityData,
  ProjectSettingsData,
  TaskData,
} from "@/lib/validators/project";

// ─── Slug utility ──────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string
): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    slug = `${base}-${counter++}`;
  }
}

// ─── Projects ──────────────────────────────────────────────────────────────

export async function createProjectFromOpportunity(
  opportunity: OpportunityForProject,
  projectData: ProjectFromOpportunityData
): Promise<ActionResult<{ id: string; slug: string }>> {
  const supabase = await createClient();

  try {
    const limitCheck = await checkProjectLimit(opportunity.agency_id);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.reason! };
    }

    const slug = await generateUniqueSlug(supabase, projectData.name);

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        agency_id: opportunity.agency_id,
        opportunity_id: opportunity.id,
        company_id: opportunity.company_id,
        name: projectData.name,
        description: opportunity.description,
        slug,
        status: "active",
        start_date:
          projectData.start_date ?? new Date().toISOString().split("T")[0],
        figma_url: projectData.figma_url,
        github_url: projectData.github_url,
      })
      .select("id, slug")
      .single();

    if (error) throw error;

    if (opportunity.status !== "won") {
      await supabase
        .from("opportunities")
        .update({ status: "won" })
        .eq("id", opportunity.id);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog?.capture({
        distinctId: user.id,
        event: "project_created_from_opportunity",
        properties: {
          project_id: project.id,
          opportunity_id: opportunity.id,
          agency_id: opportunity.agency_id,
        },
      });
      await posthog?.shutdown();
    }

    revalidatePath("/app/projects");
    revalidatePath("/app/opportunities");

    return { success: true, data: project };
  } catch (error) {
    console.error("Erreur création projet:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createProject(
  data: NewProjectFormValues,
  agencyId: string
): Promise<ActionResult<{ id: string; slug: string }>> {
  const supabase = await createClient();

  try {
    const limitCheck = await checkProjectLimit(agencyId);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.reason! };
    }

    let companyId: string | null = null;

    if (data.isNewCompany && data.newCompanyData?.name) {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: data.newCompanyData.name,
          email: data.newCompanyData.email || null,
          phone_number: data.newCompanyData.phone_number || null,
          website: data.newCompanyData.website || null,
          business_sector: data.newCompanyData.business_sector || null,
          agency_id: agencyId,
        })
        .select("id")
        .single();

      if (companyError) throw companyError;
      companyId = newCompany.id;
    } else if (data.companyId && data.companyId !== "none") {
      companyId = data.companyId;
    }

    const slug = await generateUniqueSlug(supabase, data.name);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: data.name,
        company_id: companyId,
        agency_id: agencyId,
        slug,
        status: "active",
      })
      .select("id, slug")
      .single();

    if (projectError) throw projectError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog?.capture({
        distinctId: user.id,
        event: "project_created",
        properties: {
          project_id: project.id,
          agency_id: agencyId,
        },
      });
      await posthog?.shutdown();
    }

    revalidatePath("/app/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Erreur création projet:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteProject(
  projectId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user?.id)
    .single();

  if (profileError || !profile?.agency_id) {
    return { success: false, error: "Aucune agence associée à votre compte" };
  }

  if (profile.role !== "agency_admin") {
    return {
      success: false,
      error: "Vous n'avez pas les permissions pour supprimer ce projet",
    };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("agency_id", profile.agency_id);

  if (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Erreur lors de la suppression du projet." };
  }

  const posthog = getPostHogClient();
  posthog?.capture({
    distinctId: user!.id,
    event: "project_deleted",
    properties: {
      project_id: projectId,
      agency_id: profile.agency_id,
    },
  });
  await posthog?.shutdown();

  revalidatePath("/app/projects");
  return { success: true, data: undefined };
}

export async function getProjectBySlug(
  slug: string
): Promise<ActionResult<any>> {
  const supabase = await createClient();

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("*, company:companies(*)")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return { success: true, data: project };
  } catch (error) {
    console.error("Erreur fetch projet:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateProjectSettings(
  projectId: string,
  data: ProjectSettingsData
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("projects")
      .update({
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        figma_url: data.figma_url,
        github_url: data.github_url,
        deployment_url: data.deployment_url,
        portal_message: data.portal_message,
        portal_show_progress: data.portal_show_progress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur mise à jour projet:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function generateProjectMagicLink(
  projectId: string
): Promise<ActionResult<{ token: string }>> {
  const supabase = await createClient();

  try {
    const newToken = crypto.randomUUID();

    const { error } = await supabase
      .from("projects")
      .update({ magic_token: newToken, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: { token: newToken } };
  } catch (error) {
    console.error("Erreur génération token:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function togglePortalStatus(
  projectId: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("projects")
      .update({ is_portal_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export async function createTask(
  data: TaskData,
  agencyId: string,
  projectId: string
): Promise<ActionResult<unknown>> {
  const supabase = await createClient();

  try {
    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        agency_id: agencyId,
        project_id: projectId,
        title: data.title,
        description: data.description,
        status: data.status ?? "todo",
        type: data.type ?? "feature",
        priority: data.priority ?? "medium",
        assignee_id: data.assignee_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: newTask };
  } catch (error) {
    console.error("Erreur création tâche:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTaskDetails(
  taskId: string,
  data: TaskData
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("tasks")
      .update({
        title: data.title,
        description: data.description,
        status: data.status,
        type: data.type,
        priority: data.priority,
        assignee_id: data.assignee_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur mise à jour tâche:", error);
    return { success: false, error: (error as Error).message };
  }
}

// ─── Checklist ─────────────────────────────────────────────────────────────

export async function getProjectChecklists(
  projectId: string
): Promise<ActionResult<unknown[]>> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("project_checklists")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("Erreur fetch checklists:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createChecklistItem(
  projectId: string,
  data: ChecklistItemData
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("project_checklists").insert({
      project_id: projectId,
      title: data.title,
      description: data.description,
      expected_type: data.expected_type,
      status: "pending",
    });

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur création checklist:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteChecklistItem(
  itemId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("project_checklists")
      .delete()
      .eq("id", itemId);

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur suppression checklist:", error);
    return { success: false, error: (error as Error).message };
  }
}

// ─── Internal Project ──────────────────────────────────────────────────────

export async function getOrCreateInternalProject(
  agencyId: string
): Promise<ActionResult<{ slug: string }>> {
  const supabase = await createClient();

  try {
    // Try to find an existing internal project
    const { data: existing } = await supabase
      .from("projects")
      .select("slug")
      .eq("agency_id", agencyId)
      .eq("is_internal", true)
      .maybeSingle();

    if (existing) {
      return { success: true, data: { slug: existing.slug } };
    }

    // Fetch agency name for the project name
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .single();

    const projectName = agency?.name ? `${agency.name} – Interne` : "Espace interne";
    const slug = await generateUniqueSlug(supabase, projectName);

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: projectName,
        agency_id: agencyId,
        company_id: null,
        slug,
        status: "active",
        is_internal: true,
      })
      .select("slug")
      .single();

    if (error) throw error;

    revalidatePath("/app/projects");
    return { success: true, data: { slug: project.slug } };
  } catch (error) {
    console.error("Erreur projet interne:", error);
    return { success: false, error: (error as Error).message };
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────

interface ProjectOverviewStats {
  totalTasks: number;
  doneTasks: number;
  totalChecklist: number;
  doneChecklist: number;
}

export async function getProjectOverviewStats(
  projectId: string
): Promise<ActionResult<ProjectOverviewStats>> {
  const supabase = await createClient();

  try {
    const [{ data: tasks }, { data: checklists }] = await Promise.all([
      supabase.from("tasks").select("status").eq("project_id", projectId),
      supabase
        .from("project_checklists")
        .select("status")
        .eq("project_id", projectId),
    ]);

    return {
      success: true,
      data: {
        totalTasks: tasks?.length ?? 0,
        doneTasks: tasks?.filter((t) => t.status === "done").length ?? 0,
        totalChecklist: checklists?.length ?? 0,
        doneChecklist:
          checklists?.filter((c) => c.status === "uploaded").length ?? 0,
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
