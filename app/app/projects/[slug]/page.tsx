"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/providers/project-provider";
import { getProjectOverviewStats } from "@/actions/project.server";
import { CheckCircle2, ListChecks, KanbanSquare, Clock, AlignLeft, Building2, CalendarDays, Figma, Globe, ExternalLink } from "lucide-react";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

export default function ProjectOverviewPage() {
    const project = useProject();
    const [stats, setStats] = useState({ totalTasks: 0, doneTasks: 0, totalChecklist: 0, doneChecklist: 0 });
    const [, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (!project) return;

        let cancelled = false;

        const fetchStats = async () => {
            setIsLoadingStats(true);
            const result = await getProjectOverviewStats(project.id);
            if (!cancelled && result.success) {
                setStats(result.data);
            }
            if (!cancelled) {
                setIsLoadingStats(false);
            }
        };

        void fetchStats();

        return () => {
            cancelled = true;
        };
    }, [project]);

    if (!project) return null;

    const taskProgress = stats.totalTasks === 0 ? 0 : Math.round((stats.doneTasks / stats.totalTasks) * 100);
    const checklistProgress = stats.totalChecklist === 0 ? 0 : Math.round((stats.doneChecklist / stats.totalChecklist) * 100);

    return (
        <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">

            {/* 📊 SECTION 1 : Les KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-3xl border flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <KanbanSquare className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="card-title">Avancement Équipe</h3>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-black text-foreground">{taskProgress}%</span>
                            <span className="text-sm font-semibold text-muted-foreground">{stats.doneTasks} / {stats.totalTasks} tickets</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-3xl border flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ListChecks className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="card-title mb-1">Contenus Client</h3>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-black text-foreground">{checklistProgress}%</span>
                            <span className="text-sm font-semibold text-muted-foreground">{stats.doneChecklist} / {stats.totalChecklist} éléments</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${checklistProgress}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 📝 SECTION 2 : Brief & Détails */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-3xl border p-8 h-full">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <h2 className="card-title">Brief du projet</h2>
                        </div>
                        <div className="prose prose-slate max-w-none text-muted-foreground">
                            {project.description ? (
                                <RichTextViewer content={project.description} className="text-[15px]" />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground italic bg-muted rounded-2xl border border-dashed border-border">
                                    Aucune description ou brief fourni pour ce projet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-card rounded-3xl border p-6 h-full">
                        <h2 className="card-title mb-6">Informations clés</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-muted-foreground mb-0.5">Statut actuel</p>
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        {project.status === 'active' ? 'En production' : project.status}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-muted-foreground mb-0.5">Client final</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {project.company?.name || "Projet Interne"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0">
                                    <CalendarDays className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-muted-foreground mb-0.5">Lancement prévu</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        }) : "Non définie"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🎨 SECTION 3 : Aperçus (Figma & Site) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Aperçu Figma */}
                {project.figma_url && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F24E1E]/10 rounded-xl text-[#F24E1E]">
                                    <Figma className="w-5 h-5" />
                                </div>
                                <h2 className="card-title">Design (Figma)</h2>
                            </div>
                            <a href={project.figma_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#F24E1E] hover:text-[#F24E1E]/80 flex items-center gap-1">
                                Ouvrir <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="bg-card p-2 rounded-[2rem] border h-[500px] w-full relative">
                            <iframe
                                title="Figma Preview"
                                className="w-full h-full rounded-[1.5rem] border-none bg-muted"
                                src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(project.figma_url)}`}
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* Aperçu du Site en Staging / Prod */}
                {project.deployment_url && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h2 className="card-title">Site en direct</h2>
                            </div>
                            <a href={project.deployment_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1">
                                Ouvrir <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="bg-card p-2 rounded-[2rem] border h-[500px] w-full relative group overflow-hidden">
                            {/* Un petit header "navigateur" factice pour faire joli */}
                            <div className="absolute top-2 left-2 right-2 h-10 bg-muted rounded-t-[1.5rem] flex items-center px-4 gap-2 z-10 border-b border-border">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                </div>
                                <div className="ml-4 flex-1 flex justify-center">
                                    <div className="bg-card px-3 py-1 rounded-md text-[10px] text-muted-foreground font-mono truncate max-w-[200px] border border-border shadow-sm">
                                        {project.deployment_url.replace(/^https?:\/\//, '')}
                                    </div>
                                </div>
                            </div>
                            <iframe
                                title="Deployment Preview"
                                className="w-full h-full rounded-[1.5rem] border-none bg-muted pt-10"
                                src={project.deployment_url}
                                sandbox="allow-scripts allow-same-origin"
                            />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
