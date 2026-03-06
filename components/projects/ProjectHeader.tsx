"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Figma, Github, Globe, Layout, KanbanSquare, Settings, ArrowLeft, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectHeader({ project }: { project: any }) {
    const pathname = usePathname();
    const baseUrl = `/app/projects/${project.slug}`;

    const allTabs = [
        { name: "Vue d'ensemble", path: baseUrl, icon: Layout },
        { name: "Board Kanban", path: `${baseUrl}/board`, icon: KanbanSquare },
        ...(!project.is_internal ? [{ name: "Contenus attendus", path: `${baseUrl}/checklist`, icon: ListChecks }] : []),
        { name: "Paramètres", path: `${baseUrl}/settings`, icon: Settings },
    ];
    const tabs = allTabs;

    const companyInitial = project.company?.name?.charAt(0).toUpperCase() || "P";

    return (
        <div className="bg-white border-b border-slate-200">
            {/* TOP BAR : Breadcrumb & Links */}
            <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-4">
                <Link href="/app/projects" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" />
                    Tous les projets
                </Link>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Project Title & Company */}
                    <div className="flex items-center gap-4">
                        <div
                            className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0 text-white"
                            style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}
                        >
                            {companyInitial}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {project.name}
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                                {project.is_internal
                                    ? <span className="text-slate-500">Espace interne</span>
                                    : <>Client : <span className="text-slate-700">{project.company?.name || "—"}</span></>
                                }
                            </p>
                        </div>
                    </div>

                    {/* Quick Assets Links (Figma, Repo, Live) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {project.figma_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-[#F24E1E]/10 hover:text-[#F24E1E] hover:border-[#F24E1E]/30 transition-colors" asChild>
                                <a href={project.figma_url} target="_blank" rel="noopener noreferrer">
                                    <Figma className="w-4 h-4 mr-2" /> Maquettes
                                </a>
                            </Button>
                        )}
                        {project.github_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors" asChild>
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                    <Github className="w-4 h-4 mr-2" /> Repository
                                </a>
                            </Button>
                        )}
                        {project.deployment_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors" asChild>
                                <a href={project.deployment_url} target="_blank" rel="noopener noreferrer">
                                    <Globe className="w-4 h-4 mr-2" /> Production
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM BAR : Navigation Tabs */}
            <div className="max-w-[1400px] mx-auto">
                <nav className="flex items-center gap-2 overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.path;
                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    <tab.icon
                                        className="w-4 h-4"
                                        style={isActive ? { color: 'var(--brand-secondary, #6366F1)' } : undefined}
                                    />
                                    {tab.name}
                                </div>

                                {/* L'animation de l'onglet actif */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeProjectTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                                        style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}