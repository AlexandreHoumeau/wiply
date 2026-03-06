"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/providers/project-provider";
import { getProjectOverviewStats } from "@/actions/project.server";
import { CheckCircle2, ListChecks, KanbanSquare, Clock, AlignLeft, Building2, CalendarDays, Figma, Globe, ExternalLink } from "lucide-react";

export default function ProjectOverviewPage() {
    const project = useProject();
    const [stats, setStats] = useState({ totalTasks: 0, doneTasks: 0, totalChecklist: 0, doneChecklist: 0 });
    const [, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (project) {
            loadStats();
        }
    }, [project]);

    const loadStats = async () => {
        setIsLoadingStats(true);
        const result = await getProjectOverviewStats(project!.id);
        if (result.success) {
            setStats(result.data);
        }
        setIsLoadingStats(false);
    };

    if (!project) return null;

    const taskProgress = stats.totalTasks === 0 ? 0 : Math.round((stats.doneTasks / stats.totalTasks) * 100);
    const checklistProgress = stats.totalChecklist === 0 ? 0 : Math.round((stats.doneChecklist / stats.totalChecklist) * 100);

    return (
        <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            
            {/* 📊 SECTION 1 : Les KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <KanbanSquare className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Avancement Équipe</h3>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-black text-slate-900">{taskProgress}%</span>
                            <span className="text-sm font-semibold text-slate-400">{stats.doneTasks} / {stats.totalTasks} tickets</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ListChecks className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Contenus Client</h3>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-black text-slate-900">{checklistProgress}%</span>
                            <span className="text-sm font-semibold text-slate-400">{stats.doneChecklist} / {stats.totalChecklist} éléments</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${checklistProgress}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 📝 SECTION 2 : Brief & Détails */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border p-8 h-full">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Brief du projet</h2>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-600">
                            {project.description ? (
                                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{project.description}</p>
                            ) : (
                                <div className="text-center py-10 text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    Aucune description ou brief fourni pour ce projet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border p-6 h-full">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Informations clés</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-0.5">Statut actuel</p>
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        {project.status === 'active' ? 'En production' : project.status}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-0.5">Client final</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {project.company?.name || "Projet Interne"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                                    <CalendarDays className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-0.5">Lancement prévu</p>
                                    <p className="text-sm font-semibold text-slate-900">
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
                                <h2 className="text-lg font-bold text-slate-900">Design (Figma)</h2>
                            </div>
                            <a href={project.figma_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#F24E1E] hover:text-[#F24E1E]/80 flex items-center gap-1">
                                Ouvrir <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                        
                        <div className="bg-white p-2 rounded-[2rem] border h-[500px] w-full relative">
                            <iframe
                                title="Figma Preview"
                                className="w-full h-full rounded-[1.5rem] border-none bg-slate-50"
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
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Site en direct</h2>
                            </div>
                            <a href={project.deployment_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                Ouvrir <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                        
                        <div className="bg-white p-2 rounded-[2rem] border h-[500px] w-full relative group overflow-hidden">
                            {/* Un petit header "navigateur" factice pour faire joli */}
                            <div className="absolute top-2 left-2 right-2 h-10 bg-slate-100 rounded-t-[1.5rem] flex items-center px-4 gap-2 z-10 border-b border-slate-200">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                </div>
                                <div className="ml-4 flex-1 flex justify-center">
                                    <div className="bg-white px-3 py-1 rounded-md text-[10px] text-slate-400 font-mono truncate max-w-[200px] border border-slate-200 shadow-sm">
                                        {project.deployment_url.replace(/^https?:\/\//, '')}
                                    </div>
                                </div>
                            </div>
                            <iframe
                                title="Deployment Preview"
                                className="w-full h-full rounded-[1.5rem] border-none bg-slate-50 pt-10" // pt-10 pour laisser la place au faux header
                                src={project.deployment_url}
                                sandbox="allow-scripts allow-same-origin" // Sécurité basique pour l'iframe
                            />
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
}