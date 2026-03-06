import { getProjectBySlug } from "@/actions/project.server";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { notFound } from "next/navigation";
import { ProjectProvider } from "@/providers/project-provider";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }>; }) {
    const { slug } = await params;
    const result = await getProjectBySlug(slug);

    if (!result.success || !result.data) notFound();
    const project = result.data;

    return (
        <ProjectProvider project={project}>
            <div className="flex flex-col h-full bg-background">
                <ProjectHeader project={project} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </ProjectProvider>
    );
}