"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Figma, Github, Globe, Layout, KanbanSquare, Settings, ArrowLeft, ListChecks, Tag, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectContextValue } from "@/providers/project-provider";

type ProjectHeaderProject = ProjectContextValue & {
    is_internal?: boolean | null;
    company?: {
        name: string | null;
    } | null;
};

export function ProjectHeader({ project }: { project: ProjectHeaderProject }) {
    const pathname = usePathname();
    const baseUrl = `/app/projects/${project.slug}`;

    const allTabs = [
        { name: "Vue d'ensemble", path: baseUrl, icon: Layout },
        { name: "Board Kanban", path: `${baseUrl}/board`, icon: KanbanSquare },
        { name: "Versions", path: `${baseUrl}/versions`, icon: Tag },
        ...(!project.is_internal ? [{ name: "Contenus attendus", path: `${baseUrl}/checklist`, icon: ListChecks }] : []),
        { name: "Fichiers", path: `${baseUrl}/files`, icon: FolderOpen },
        { name: "Paramètres", path: `${baseUrl}/settings`, icon: Settings },
    ];
    const tabs = allTabs;

    const companyInitial = project.company?.name?.charAt(0).toUpperCase() || "P";

    return (
        <div className="bg-background border-b border-border">
            {/* TOP BAR : Breadcrumb & Links */}
            <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-4">
                <Link href="/app/projects" className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-6 group">
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
                            <h1 className="text-2xl font-bold text-foreground">
                                {project.name}
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">
                                {project.is_internal
                                    ? <span className="text-muted-foreground">Espace interne</span>
                                    : <>Client : <span className="text-foreground/80">{project.company?.name || "—"}</span></>
                                }
                            </p>
                        </div>
                    </div>

                    {/* Quick Assets Links (Figma, Repo, Live) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {project.figma_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-muted-foreground hover:bg-[#F24E1E]/10 hover:text-[#F24E1E] hover:border-[#F24E1E]/30 transition-colors" asChild>
                                <a href={project.figma_url} target="_blank" rel="noopener noreferrer">
                                    <Figma className="w-4 h-4 mr-2" /> Maquettes
                                </a>
                            </Button>
                        )}
                        {project.github_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-muted-foreground hover:bg-muted transition-colors" asChild>
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                    <Github className="w-4 h-4 mr-2" /> Repository
                                </a>
                            </Button>
                        )}
                        {project.deployment_url && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800/40 transition-colors" asChild>
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
                                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
