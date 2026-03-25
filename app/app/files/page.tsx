import { getAgencyFiles } from "@/actions/files.server";
import { FilesTable } from "@/components/files/FilesTable";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import { isProPlan } from "@/lib/validators/agency";
import { redirect } from "next/navigation";

export default async function FilesPage() {
    const ctx = await getAuthenticatedUserContext();
    if (!isProPlan(ctx.agency)) redirect("/app");

    const result = await getAgencyFiles();
    const files = result.success ? (result.data ?? []) : [];

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Fichiers</h1>
                <p className="text-muted-foreground mt-1">Fichiers et liens de l&apos;espace de travail</p>
            </div>
            <FilesTable initialFiles={files} projectId={null} />
        </div>
    );
}
