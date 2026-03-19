"use client";

import { createContext, useContext, ReactNode } from "react";

const ProjectContext = createContext<any | null>(null);

export function ProjectProvider({ project, children }: { project: any, children: ReactNode }) {
    return (
        <ProjectContext.Provider value={project}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    return useContext(ProjectContext);
}