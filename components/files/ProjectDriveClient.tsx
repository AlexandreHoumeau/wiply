"use client";

import { useState } from "react";
import { FolderPlus, FileUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    deleteFile, getSignedUrl,
    createFolder, renameFolder, deleteFolder,
    type FileRecord, type FolderRecord, type ClientUpload,
} from "@/actions/files.server";
import { DriveListView } from "./DriveListView";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameFolderDialog } from "./RenameFolderDialog";
import { UploadFileDialog } from "./UploadFileDialog";
import { AddLinkDialog } from "./AddLinkDialog";

interface ProjectDriveClientProps {
    initialFiles: FileRecord[];
    initialFolders: FolderRecord[];
    projectId: string;
    clientUploads: ClientUpload[];
}

export function ProjectDriveClient({ initialFiles, initialFolders, projectId, clientUploads }: ProjectDriveClientProps) {
    const [files, setFiles] = useState<FileRecord[]>(initialFiles);
    const [folders, setFolders] = useState<FolderRecord[]>(initialFolders);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<FolderRecord | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    const handleCreateFolder = async (name: string) => {
        const result = await createFolder(name, projectId);
        if (result.success && result.data) {
            setFolders((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
            toast.error(result.error ?? "Erreur lors de la création du dossier");
        }
    };

    const handleRenameFolder = async (name: string) => {
        if (!renamingFolder) return;
        const result = await renameFolder(renamingFolder.id, name);
        if (result.success) {
            setFolders((prev) =>
                prev.map((f) => f.id === renamingFolder.id ? { ...f, name } : f)
                   .sort((a, b) => a.name.localeCompare(b.name))
            );
        } else {
            toast.error(result.error ?? "Erreur lors du renommage");
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        const result = await deleteFolder(folderId);
        if (result.success) {
            setFolders((prev) => prev.filter((f) => f.id !== folderId));
            setFiles((prev) => prev.map((f) => f.folder_id === folderId ? { ...f, folder_id: null } : f));
            setExpandedFolders((prev) => { const next = { ...prev }; delete next[folderId]; return next; });
        } else {
            toast.error(result.error ?? "Erreur lors de la suppression du dossier");
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        const result = await deleteFile(fileId);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.success("Fichier supprimé");
        } else {
            toast.error(result.error ?? "Erreur lors de la suppression");
        }
    };

    const handleDownload = async (file: FileRecord) => {
        if (file.type === "link" && file.url) { window.open(file.url, "_blank"); return; }
        if (file.storage_path) {
            const tab = window.open("", "_blank");
            const result = await getSignedUrl(file.storage_path);
            if (result.success && result.url && tab) { tab.location.href = result.url; }
            else { tab?.close(); toast.error("Impossible de générer le lien"); }
        }
    };

    const handleToggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <p className="text-sm text-muted-foreground">
                    {files.length} fichier{files.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="secondary" size="sm"
                        onClick={() => setCreateFolderOpen(true)}
                        className="bg-background hover:bg-muted border border-border/50 shadow-sm"
                    >
                        <FolderPlus className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Dossier</span>
                    </Button>
                    <Button
                        variant="secondary" size="sm"
                        onClick={() => setLinkOpen(true)}
                        className="bg-background hover:bg-muted border border-border/50 shadow-sm"
                    >
                        <Link2 className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Lien</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setUploadOpen(true)}
                        className="shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                    >
                        <FileUp className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Importer</span>
                    </Button>
                </div>
            </div>

            <DriveListView
                files={files}
                folders={folders}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onDownload={handleDownload}
                onDeleteFile={handleDeleteFile}
                onMoveFile={() => {}}
                onRenameFolder={setRenamingFolder}
                onDeleteFolder={handleDeleteFolder}
                clientUploads={clientUploads}
            />

            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                onConfirm={handleCreateFolder}
            />
            <RenameFolderDialog
                open={!!renamingFolder}
                onOpenChange={(open) => { if (!open) setRenamingFolder(null); }}
                currentName={renamingFolder?.name ?? ""}
                onConfirm={handleRenameFolder}
            />
            <UploadFileDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                projectId={projectId}
                onUploaded={(file) => setFiles((prev) => [file, ...prev])}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={projectId}
                onAdded={(file) => setFiles((prev) => [file, ...prev])}
            />
        </div>
    );
}
