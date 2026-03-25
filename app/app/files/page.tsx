import { getAgencyFiles, getFolders, getStorageUsage } from "@/actions/files.server";
import { DriveClient } from "@/components/files/DriveClient";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import { isProPlan } from "@/lib/validators/agency";
import { redirect } from "next/navigation";

export default async function FilesPage() {
    const ctx = await getAuthenticatedUserContext();
    if (!isProPlan(ctx.agency)) redirect("/app");

    const [filesResult, foldersResult, storageResult] = await Promise.all([
        getAgencyFiles(),
        getFolders(),
        getStorageUsage(),
    ]);

    const files = filesResult.success ? (filesResult.data ?? []) : [];
    const folders = foldersResult.success ? (foldersResult.data ?? []) : [];
    const usedBytes = storageResult.success ? (storageResult.data?.usedBytes ?? 0) : 0;
    const limitBytes = storageResult.success ? (storageResult.data?.limitBytes ?? 0) : 0;

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Drive</h1>
                <p className="text-muted-foreground mt-1">Fichiers et liens de l&apos;espace de travail</p>
            </div>
            <DriveClient
                initialFiles={files}
                initialFolders={folders}
                usedBytes={usedBytes}
                limitBytes={limitBytes}
            />
        </div>
    );
}
