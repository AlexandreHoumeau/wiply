"use server";

import { createClient } from "@/lib/supabase/server";
import { checkProjectLimit } from "@/lib/billing/checkLimit";
import { createNotification } from "@/lib/notifications";
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

// ─── Slug & prefix utilities ───────────────────────────────────────────────

function generateTaskPrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const raw =
    words.length === 1
      ? words[0].substring(0, 3)
      : words.map((w) => w[0]).join("").substring(0, 4);
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "") || "TCK";
}

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
        task_prefix: generateTaskPrefix(projectData.name),
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
        task_prefix: generateTaskPrefix(data.name),
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
        task_prefix: data.task_prefix,
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
    const { data: { user } } = await supabase.auth.getUser();

    // Compute next sequential task number for this project
    const { data: maxRow } = await supabase
      .from("tasks")
      .select("task_number")
      .eq("project_id", projectId)
      .order("task_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (maxRow?.task_number ?? 0) + 1;

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
        due_date: data.due_date ?? null,
        parent_id: data.parent_id ?? null,
        version_id: data.version_id ?? null,
        task_number: nextNumber,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify assignee if different from creator
    if (data.assignee_id && user && data.assignee_id !== user.id) {
      await createNotification({
        agencyId,
        userId: data.assignee_id,
        type: "task_assigned",
        title: "Tâche assignée",
        body: `Vous avez été assigné à "${data.title}"`,
        metadata: { task_id: (newTask as any).id },
      });
    }

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
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch current task to detect assignee change
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assignee_id, agency_id")
      .eq("id", taskId)
      .single();

    const { error } = await supabase
      .from("tasks")
      .update({
        title: data.title,
        description: data.description,
        status: data.status,
        type: data.type,
        priority: data.priority,
        assignee_id: data.assignee_id ?? null,
        due_date: data.due_date ?? null,
        parent_id: data.parent_id ?? null,
        version_id: data.version_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;

    // Notify new assignee if it changed and they're not the one making the change
    const newAssignee = data.assignee_id ?? null;
    if (
      currentTask &&
      newAssignee &&
      newAssignee !== currentTask.assignee_id &&
      user &&
      newAssignee !== user.id
    ) {
      await createNotification({
        agencyId: currentTask.agency_id,
        userId: newAssignee,
        type: "task_assigned",
        title: "Tâche assignée",
        body: `Vous avez été assigné à "${data.title}"`,
        metadata: { task_id: taskId },
      });
    }

    // Notify @mentioned users in description
    if (currentTask && data.description && user) {
      const mentionedIds = [...data.description.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
      const alreadyNotified = new Set<string>([user.id]);
      for (const mentionedId of mentionedIds) {
        if (!alreadyNotified.has(mentionedId)) {
          alreadyNotified.add(mentionedId);
          await createNotification({
            agencyId: currentTask.agency_id,
            userId: mentionedId,
            type: "task_mention",
            title: "Vous avez été mentionné",
            body: `Vous avez été mentionné dans la description de "${data.title}"`,
            metadata: { task_id: taskId },
          });
        }
      }
    }

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
        task_prefix: generateTaskPrefix(projectName),
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
