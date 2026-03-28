import { getProjectBySlug } from "@/actions/project.server";
import { getProjectFiles, getProjectClientUploads, getFolders } from "@/actions/files.server";
import { ProjectDriveClient } from "@/components/files/ProjectDriveClient";
import { notFound } from "next/navigation";

export default async function ProjectFilesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);
    if (!projectResult.success || !projectResult.data) notFound();

    const project = projectResult.data;
    const [filesResult, clientUploadsResult, foldersResult] = await Promise.all([
        getProjectFiles(project.id),
        getProjectClientUploads(project.id),
        getFolders(project.id),
    ]);
    const files = filesResult.success ? (filesResult.data ?? []) : [];
    const clientUploads = clientUploadsResult.success ? (clientUploadsResult.data ?? []) : [];
    const folders = foldersResult.success ? (foldersResult.data ?? []) : [];

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <ProjectDriveClient
                initialFiles={files}
                initialFolders={folders}
                projectId={project.id}
                clientUploads={clientUploads}
            />
        </div>
    );
}
