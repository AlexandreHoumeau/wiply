"use client";

import { ChevronDown, ChevronRight, Folder, Link2, FileUp, Trash2, Download, ExternalLink, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import type { FileRecord, FolderRecord } from "@/actions/files.server";

interface DriveListViewProps {
    files: FileRecord[];
    folders: FolderRecord[];
    expandedFolders: Record<string, boolean>;
    onToggleFolder: (folderId: string) => void;
    onDownload: (file: FileRecord) => void;
    onDeleteFile: (fileId: string) => void;
    onMoveFile: (fileId: string, folderId: string | null) => void;
    onRenameFolder: (folder: FolderRecord) => void;
    onDeleteFolder: (folderId: string) => void;
}

function FileRow({ file, folders, onDownload, onDelete, onMove }: {
    file: FileRecord;
    folders: FolderRecord[];
    onDownload: (f: FileRecord) => void;
    onDelete: (id: string) => void;
    onMove: (fileId: string, folderId: string | null) => void;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
            {file.type === "link"
                ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
            }
            <button
                className="flex-1 text-sm font-medium text-left truncate hover:underline"
                onClick={() => onDownload(file)}
            >
                {file.name}
            </button>
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {file.size ? formatBytes(file.size) : "Lien"}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {file.type === "link" ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={file.url!} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(file)}>
                        <Download className="w-3.5 h-3.5" />
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {folders.map((f) => (
                            <DropdownMenuItem
                                key={f.id}
                                disabled={file.folder_id === f.id}
                                onClick={() => onMove(file.id, f.id)}
                            >
                                Déplacer vers « {f.name} »
                            </DropdownMenuItem>
                        ))}
                        {file.folder_id !== null && (
                            <DropdownMenuItem onClick={() => onMove(file.id, null)}>
                                Déplacer à la racine
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(file.id)}
                        >
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function DriveListView({
    files, folders, expandedFolders,
    onToggleFolder, onDownload, onDeleteFile, onMoveFile, onRenameFolder, onDeleteFolder,
}: DriveListViewProps) {
    const rootFiles = files.filter((f) => f.folder_id === null);

    return (
        <div className="space-y-2">
            {/* Root files */}
            {rootFiles.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-2 bg-muted/30 border-b border-border">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sans dossier</span>
                    </div>
                    {rootFiles.map((file) => (
                        <FileRow
                            key={file.id}
                            file={file}
                            folders={folders}
                            onDownload={onDownload}
                            onDelete={onDeleteFile}
                            onMove={onMoveFile}
                        />
                    ))}
                </div>
            )}

            {/* Folder sections */}
            {folders.map((folder) => {
                const folderFiles = files.filter((f) => f.folder_id === folder.id);
                const isExpanded = expandedFolders[folder.id] ?? false;
                const totalSize = folderFiles.reduce((s, f) => s + (f.size ?? 0), 0);

                return (
                    <div key={folder.id} className="rounded-xl border border-border overflow-hidden">
                        {/* Folder header */}
                        <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                            onClick={() => onToggleFolder(folder.id)}
                        >
                            {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            }
                            <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="flex-1 font-medium text-sm">{folder.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:block">
                                {folderFiles.length} fichier{folderFiles.length !== 1 ? "s" : ""}
                                {totalSize > 0 ? ` · ${formatBytes(totalSize)}` : ""}
                            </span>
                            {/* Folder actions — stop propagation so they don't toggle expand */}
                            <div
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                                            Renommer
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => onDeleteFolder(folder.id)}
                                        >
                                            Supprimer le dossier
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Folder contents */}
                        {isExpanded && (
                            <div className="border-t border-border">
                                {folderFiles.length === 0 ? (
                                    <p className="text-sm text-muted-foreground px-4 py-3">Dossier vide.</p>
                                ) : (
                                    folderFiles.map((file) => (
                                        <FileRow
                                            key={file.id}
                                            file={file}
                                            folders={folders}
                                            onDownload={onDownload}
                                            onDelete={onDeleteFile}
                                            onMove={onMoveFile}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Empty state */}
            {rootFiles.length === 0 && folders.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                    Aucun fichier pour l&apos;instant. Uploadez un fichier ou ajoutez un lien.
                </div>
            )}
        </div>
    );
}
