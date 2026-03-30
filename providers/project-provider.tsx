"use client";

import { createContext, useContext, ReactNode } from "react";

export type ProjectContextValue = {
    id: string;
    agency_id: string;
    slug: string;
    name: string;
    description?: string | null;
    status?: string | null;
    task_prefix?: string | null;
    start_date?: string | null;
    figma_url?: string | null;
    github_url?: string | null;
    deployment_url?: string | null;
    portal_message?: string | null;
    portal_show_progress?: boolean | null;
    magic_token?: string | null;
    is_portal_active?: boolean | null;
    company_id?: string | null;
    company?: { id: string; name: string } | null;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ project, children }: { project: ProjectContextValue; children: ReactNode }) {
    return (
        <ProjectContext.Provider value={project}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    return useContext(ProjectContext);
}
