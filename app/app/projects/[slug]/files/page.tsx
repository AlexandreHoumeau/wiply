import { getProjectBySlug } from "@/actions/project.server";
import { getProjectFiles } from "@/actions/files.server";
import { FilesTable } from "@/components/files/FilesTable";
import { notFound } from "next/navigation";

export default async function ProjectFilesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);
    if (!projectResult.success || !projectResult.data) notFound();

    const project = projectResult.data;
    const filesResult = await getProjectFiles(project.id);
    const files = filesResult.success ? (filesResult.data ?? []) : [];

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <FilesTable initialFiles={files} projectId={project.id} />
        </div>
    );
}
