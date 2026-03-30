import { getProjectBySlug } from "@/actions/project.server";
import { getProjectTasks } from "@/actions/task.server";
import { getProjectVersions } from "@/actions/version.server";
import { notFound } from "next/navigation";
import { VersionsClient } from "./VersionsClient";
import type { ProjectContextValue } from "@/providers/project-provider";
import type { TaskComment } from "@/actions/task.server";

type ProjectTask = {
    id: string;
    title: string;
    status: string | null;
    version_id: string | null;
    task_number: number | null;
    parent_id: string | null;
    position: number | null;
    due_date: string | null;
    priority: string | null;
    type: string | null;
    description: string | null;
    assignee: {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
    } | null;
    task_comments?: Array<Pick<TaskComment, "id"> & { count?: number }> | null;
};

export default async function ProjectVersionsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);
    if (!projectResult.success || !projectResult.data) notFound();
    const project = projectResult.data as ProjectContextValue;

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
            tasks={tasks as ProjectTask[]}
        />
    );
}
