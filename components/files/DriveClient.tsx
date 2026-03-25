"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    deleteFile, getSignedUrl,
    createFolder, renameFolder, deleteFolder, moveFileToFolder,
    type FileRecord, type FolderRecord,
} from "@/actions/files.server";
import { DriveHeader } from "./DriveHeader";
import { DriveListView } from "./DriveListView";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameFolderDialog } from "./RenameFolderDialog";
import { UploadFileDialog } from "./UploadFileDialog";
import { AddLinkDialog } from "./AddLinkDialog";

const LS_KEY = "drive-expanded-folders";

interface DriveClientProps {
    initialFiles: FileRecord[];
    initialFolders: FolderRecord[];
    usedBytes: number;
    limitBytes: number;
}

export function DriveClient({ initialFiles, initialFolders, usedBytes: initialUsed, limitBytes }: DriveClientProps) {
    const [files, setFiles] = useState<FileRecord[]>(initialFiles);
    const [folders, setFolders] = useState<FolderRecord[]>(initialFolders);
    const [usedBytes, setUsedBytes] = useState(initialUsed);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    // Hydrate expanded state from localStorage after mount (SSR-safe)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) setExpandedFolders(JSON.parse(stored));
        } catch {}
    }, []);

    const saveExpanded = (next: Record<string, boolean>) => {
        setExpandedFolders(next);
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    };

    // Dialog state
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<FolderRecord | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    // ── Folder mutations ───────────────────────────────────────────────────

    const handleCreateFolder = async (name: string) => {
        const result = await createFolder(name);
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
            const next = { ...expandedFolders };
            delete next[folderId];
            saveExpanded(next);
        } else {
            toast.error(result.error ?? "Erreur lors de la suppression du dossier");
        }
    };

    // ── File mutations ─────────────────────────────────────────────────────

    const handleMoveFile = async (fileId: string, folderId: string | null) => {
        const result = await moveFileToFolder(fileId, folderId);
        if (result.success) {
            setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, folder_id: folderId } : f));
        } else {
            toast.error(result.error ?? "Erreur lors du déplacement");
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        const result = await deleteFile(fileId);
        if (result.success) {
            const file = files.find((f) => f.id === fileId);
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            if (file?.size) setUsedBytes((prev) => Math.max(0, prev - (file.size ?? 0)));
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
        const next = { ...expandedFolders, [folderId]: !expandedFolders[folderId] };
        saveExpanded(next);
    };

    return (
        <div>
            <DriveHeader
                usedBytes={usedBytes}
                limitBytes={limitBytes}
                onNewFolder={() => setCreateFolderOpen(true)}
                onUpload={() => setUploadOpen(true)}
                onAddLink={() => setLinkOpen(true)}
            />

            <DriveListView
                files={files}
                folders={folders}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onDownload={handleDownload}
                onDeleteFile={handleDeleteFile}
                onMoveFile={handleMoveFile}
                onRenameFolder={setRenamingFolder}
                onDeleteFolder={handleDeleteFolder}
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
                projectId={null}
                onUploaded={(file) => {
                    setFiles((prev) => [file, ...prev]);
                    setUsedBytes((prev) => prev + (file.size ?? 0));
                }}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={null}
                onAdded={(file) => setFiles((prev) => [file, ...prev])}
            />
        </div>
    );
}
