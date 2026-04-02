import { getProjectBySlug, getProjectChecklists } from "@/actions/project.server";
import { notFound } from "next/navigation";
import { ProjectChecklistClient } from "./ProjectChecklistClient";

type ChecklistItem = {
    id: string;
    title: string;
    description: string | null;
    expected_type: string;
    status: "pending" | "uploaded";
    client_response: string | null;
    file_url: string | null;
};

export default async function ProjectChecklistPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);

    if (!projectResult.success || !projectResult.data) {
        notFound();
    }

    const checklistResult = await getProjectChecklists(projectResult.data.id);

    if (!checklistResult.success) {
        notFound();
    }

    return (
        <ProjectChecklistClient
            projectId={projectResult.data.id}
            initialItems={checklistResult.data as ChecklistItem[]}
        />
    );
}
