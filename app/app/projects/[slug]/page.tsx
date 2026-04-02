import { getProjectBySlug, getProjectOverviewStats } from "@/actions/project.server";
import { notFound } from "next/navigation";
import { ProjectOverviewClient } from "./ProjectOverviewClient";

export default async function ProjectOverviewPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);

    if (!projectResult.success || !projectResult.data) {
        notFound();
    }

    const statsResult = await getProjectOverviewStats(projectResult.data.id);

    if (!statsResult.success) {
        notFound();
    }

    return (
        <ProjectOverviewClient
            project={projectResult.data}
            stats={statsResult.data}
        />
    );
}
