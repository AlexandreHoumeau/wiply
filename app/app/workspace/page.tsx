import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import { getOrCreateInternalProject } from "@/actions/project.server";
import { getProjectTasks } from "@/actions/task.server";
import { BoardContainer } from "@/components/projects/BoardContainer";
import { Layers, ArrowRight, FolderKanban } from "lucide-react";

export default async function WorkspacePage() {
    const userContext = await getAuthenticatedUserContext();
    if (!userContext) redirect("/auth/login");

    const agencyId = userContext.agency.id;
    const supabase = await createClient();

    // Get or create the internal project
    const projectResult = await getOrCreateInternalProject(agencyId);
    if (!projectResult.success || !projectResult.data) redirect("/app/projects");
    const internalSlug = projectResult.data.slug;

    // Fetch internal project details
    const { data: internalProject } = await supabase
        .from("projects")
        .select("id, name")
        .eq("slug", internalSlug)
        .single();

    if (!internalProject) redirect("/app/projects");

    // Fetch tasks for the internal kanban
    const tasksResult = await getProjectTasks(internalProject.id);
    const tasks = tasksResult.success ? (tasksResult.data ?? []) : [];

    return (
        <div className="flex flex-col h-full bg-background">

            {/* Header */}
            <div className="bg-background border-b border-border px-6 py-5 shrink-0">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0">
                            <Layers className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl text-foreground">Espace interne</h1>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">Tickets internes, tâches admin et suivi agence.</p>
                        </div>
                    </div>
                    <Link
                        href="/app/projects"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group"
                    >
                        <FolderKanban className="h-4 w-4" />
                        Tous les projets clients
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Kanban board */}
            <div className="flex-1 overflow-hidden">
                <BoardContainer projectId={internalProject.id} initialTasks={tasks} />
            </div>
        </div>
    );
}
