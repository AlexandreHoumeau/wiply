import { getProjectBySlug } from "@/actions/project.server";
import { getProjectTasks } from "@/actions/task.server";
import { getProjectVersions } from "@/actions/version.server";
import { notFound } from "next/navigation";
import { VersionsClient } from "./VersionsClient";

export default async function ProjectVersionsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);
    if (!projectResult.success || !projectResult.data) notFound();
    const project = projectResult.data as any;

    const [versionsResult, tasksResult] = await Promise.all([
        getProjectVersions(project.id),
        getProjectTasks(project.id),
    ]);

    const versions = versionsResult.success ? versionsResult.data : [];
    const tasks = tasksResult.success ? tasksResult.data : [];

    return (
        <VersionsClient
            project={project}
            versions={versions}
            tasks={tasks as any[]}
        />
    );
}
