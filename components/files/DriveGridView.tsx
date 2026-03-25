"use client";

import { useState } from "react";
import { Folder, Link2, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import type { FileRecord, FolderRecord } from "@/actions/files.server";

interface DriveGridViewProps {
    files: FileRecord[];
    folders: FolderRecord[];
    onMoveFile: (fileId: string, folderId: string | null) => void;
    onFolderClick: (folderId: string) => void;
}

export function DriveGridView({ files, folders, onMoveFile, onFolderClick }: DriveGridViewProps) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overTarget, setOverTarget] = useState<string | null>(null); // folderId or "root"

    const handleDragStart = (e: React.DragEvent, fileId: string) => {
        e.dataTransfer.setData("fileId", fileId);
        setDraggingId(fileId);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setOverTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        setOverTarget(targetId);
    };

    const handleDragLeave = () => setOverTarget(null);

    const handleDrop = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        const fileId = e.dataTransfer.getData("fileId");
        if (fileId) onMoveFile(fileId, folderId);
        setDraggingId(null);
        setOverTarget(null);
    };

    return (
        <div className="space-y-6">
            {/* Folders */}
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Dossiers</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {folders.map((folder) => {
                        const count = files.filter((f) => f.folder_id === folder.id).length;
                        const isOver = overTarget === folder.id;
                        return (
                            <div
                                key={folder.id}
                                className={cn(
                                    "rounded-xl border-2 p-3 text-center cursor-pointer transition-all select-none",
                                    isOver
                                        ? "border-indigo-500 bg-indigo-500/10"
                                        : "border-border hover:border-border/80 hover:bg-muted/30"
                                )}
                                onClick={() => onFolderClick(folder.id)}
                                onDragOver={(e) => handleDragOver(e, folder.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, folder.id)}
                            >
                                <Folder className={cn("w-8 h-8 mx-auto mb-2", isOver ? "text-indigo-500" : "text-muted-foreground")} />
                                <p className="text-xs font-medium truncate">{folder.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{count} fichier{count !== 1 ? "s" : ""}</p>
                            </div>
                        );
                    })}

                    {/* Root drop target — always visible */}
                    <div
                        className={cn(
                            "rounded-xl border-2 border-dashed p-3 text-center transition-all select-none",
                            overTarget === "root"
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-border/50 hover:border-border"
                        )}
                        onDragOver={(e) => handleDragOver(e, "root")}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, null)}
                    >
                        <div className={cn("w-8 h-8 mx-auto mb-2 rounded-full border-2 border-dashed flex items-center justify-center",
                            overTarget === "root" ? "border-indigo-500" : "border-muted-foreground/30")}>
                            <span className={cn("text-lg leading-none", overTarget === "root" ? "text-indigo-500" : "text-muted-foreground/30")}>↩</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Racine</p>
                    </div>
                </div>
            </div>

            {/* Files */}
            {files.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Fichiers</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, file.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "rounded-xl border border-border p-3 text-center cursor-grab transition-all select-none",
                                    "hover:bg-muted/30",
                                    draggingId === file.id && "opacity-50 rotate-[-2deg] scale-95"
                                )}
                            >
                                {file.type === "link"
                                    ? <Link2 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                    : <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                }
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {file.size ? formatBytes(file.size) : "Lien"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {files.length === 0 && folders.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                    Aucun fichier pour l&apos;instant.
                </div>
            )}
        </div>
    );
}
