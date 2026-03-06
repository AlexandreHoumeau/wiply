// NO "use client" — this is a Server Component
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import Link from "next/link";
import { FolderKanban, Globe, Github, Figma, ArrowRight, Building2, CheckCircle2, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";

export default async function ProjectsPage() {
    const userContext = await getAuthenticatedUserContext();
    if (!userContext) return <div>Non authentifié</div>;

    const agencyId = userContext.agency.id;
    const supabase = await createClient();

    const { data: projects } = await supabase
        .from("projects")
        .select("*, company:companies(name), tasks(status)")
        .eq("agency_id", agencyId)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

    const { data: companies } = await supabase
        .from("companies")
        .select("id, name")
        .eq("agency_id", agencyId)
        .order("name", { ascending: true });

    const allProjects = projects ?? [];

    // Stats
    const activeCount = allProjects.filter(p => p.status === 'active').length;
    const completedCount = allProjects.filter(p => p.status === 'completed').length;
    const totalTasksInProgress = allProjects.flatMap(p => p.tasks ?? []).filter((t: any) => t.status === 'in_progress').length;

    // Group by company
    const byCompany = allProjects.reduce<Record<string, { companyName: string; companyId: string; projects: typeof allProjects }>>((acc, project) => {
        const key = project.company_id ?? "__none__";
        const name = project.company?.name ?? "Sans client";
        if (!acc[key]) acc[key] = { companyName: name, companyId: key, projects: [] };
        acc[key].projects.push(project);
        return acc;
    }, {});
    const companyGroups = Object.values(byCompany).sort((a, b) => a.companyName.localeCompare(b.companyName));

    const getStatusDesign = (status: string) => {
        switch (status) {
            case 'active': return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'En cours' };
            case 'completed': return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Terminé' };
            case 'archived': return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Archivé' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400', label: status };
        }
    };

    const ProjectRow = ({ project }: { project: any }) => {
        const statusDesign = getStatusDesign(project.status);
        const totalTasks = project.tasks?.length ?? 0;
        const doneTasks = project.tasks?.filter((t: any) => t.status === 'done').length ?? 0;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return (
            <Link
                href={`/app/projects/${project.slug}`}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-slate-50 transition-colors"
            >
                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-sm text-indigo-600 shrink-0">
                    {project.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {project.name}
                    </p>
                </div>

                <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {project.figma_url && <Figma className="w-3.5 h-3.5 text-slate-300" />}
                    {project.github_url && <Github className="w-3.5 h-3.5 text-slate-300" />}
                    {project.deployment_url && <Globe className="w-3.5 h-3.5 text-slate-300" />}
                </div>

                <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
                    {totalTasks > 0 ? (
                        <>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400 w-8 text-right">{progress}%</span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-300">—</span>
                    )}
                </div>

                <div className={cn("hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0", statusDesign.bg, statusDesign.text)}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", statusDesign.dot)} />
                    {statusDesign.label}
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteProjectDialog projectId={project.id} projectName={project.name} />
                    <div className="flex items-center justify-center h-7 w-7 rounded-full text-slate-300 group-hover:text-indigo-500 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="w-full flex-1 p-6 md:p-8 space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white border rounded-2xl flex items-center justify-center shrink-0">
                        <FolderKanban className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl text-slate-900 tracking-tight">Projets</h1>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Gérez le delivery et pilotez vos productions.</p>
                    </div>
                </div>
                <NewProjectModal companies={companies || []} agencyId={agencyId} />
            </div>

            {allProjects.length > 0 ? (
                <>
                    {/* Stats banner */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white border rounded-2xl px-5 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <Circle className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-slate-900">{activeCount}</p>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">En cours</p>
                            </div>
                        </div>
                        <div className="bg-white border rounded-2xl px-5 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-slate-900">{completedCount}</p>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terminés</p>
                            </div>
                        </div>
                        <div className="bg-white border rounded-2xl px-5 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <Clock className="h-4 w-4 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-slate-900">{totalTasksInProgress}</p>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tâches actives</p>
                            </div>
                        </div>
                    </div>

                    {/* Project list grouped by company */}
                    <div className="bg-white border rounded-3xl overflow-hidden">
                        {companyGroups.map((group, idx) => (
                            <div key={group.companyId} className={idx > 0 ? "border-t border-slate-100" : ""}>
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">{group.companyName}</span>
                                    <span className="ml-auto text-[11px] text-slate-300 font-semibold">{group.projects.length} projet{group.projects.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="divide-y divide-slate-50 px-2 py-1">
                                    {group.projects.map(project => (
                                        <ProjectRow key={project.id} project={project} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white border border-slate-200 border-dashed rounded-3xl">
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                        <FolderKanban className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Aucun projet actif</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                        Commencez par convertir une opportunité gagnée ou créez un projet manuellement pour lancer votre production.
                    </p>
                    <NewProjectModal agencyId={agencyId} companies={companies || []} />
                </div>
            )}
        </div>
    );
}
