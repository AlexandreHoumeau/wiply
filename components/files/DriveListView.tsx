"use client";

import { useState } from "react";
import {
    ChevronDown, ChevronRight, Folder, Link2, FileUp,
    Download, ExternalLink, MoreHorizontal, GripVertical, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatBytes } from "@/lib/utils";
import type { FileRecord, FolderRecord } from "@/actions/files.server";
import { filterFiles, sortFiles, type SortKey, type TypeFilter } from "./driveUtils";

const SORT_LABELS: Record<SortKey, string> = {
    "name-asc":  "Nom A→Z",
    "name-desc": "Nom Z→A",
    "date-desc": "Date (récent)",
    "date-asc":  "Date (ancien)",
    "size-desc": "Taille (↓)",
    "size-asc":  "Taille (↑)",
};

const TYPE_LABELS: Record<TypeFilter, string> = {
    all:    "Tous les types",
    upload: "Fichiers",
    link:   "Liens",
};

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

function FileRow({
    file, folders, isDraggable, isBeingDragged,
    onDownload, onDelete, onMove, onDragStart, onDragEnd,
}: {
    file: FileRecord;
    folders: FolderRecord[];
    isDraggable: boolean;
    isBeingDragged: boolean;
    onDownload: (f: FileRecord) => void;
    onDelete: (id: string) => void;
    onMove: (fileId: string, folderId: string | null) => void;
    onDragStart: (e: React.DragEvent, fileId: string) => void;
    onDragEnd: () => void;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group",
                isBeingDragged && "opacity-50"
            )}
            draggable={isDraggable}
            onDragStart={isDraggable ? (e) => onDragStart(e, file.id) : undefined}
            onDragEnd={isDraggable ? onDragEnd : undefined}
        >
            {isDraggable ? (
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
                <div className="w-4 shrink-0" />
            )}
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
                        {(folders.length > 0 || file.folder_id !== null) && <DropdownMenuSeparator />}
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
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortKey>("date-desc");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overTarget, setOverTarget] = useState<string | null>(null);

    const isFiltered = search.trim() !== "" || typeFilter !== "all";

    const filteredFiles = filterFiles(files, search, typeFilter);
    const rootFiles = sortFiles(filteredFiles.filter((f) => f.folder_id === null), sort);
    const visibleFolders = isFiltered
        ? folders.filter((folder) => filteredFiles.some((f) => f.folder_id === folder.id))
        : folders;

    // ── DnD handlers ──────────────────────────────────────────────────────

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
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        className="pl-9"
                        placeholder="Rechercher un fichier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0">
                            {SORT_LABELS[sort]}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                            <DropdownMenuItem key={key} onClick={() => setSort(key)}>
                                {SORT_LABELS[key]}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={typeFilter !== "all" ? "default" : "outline"}
                            size="sm"
                            className="shrink-0"
                        >
                            {TYPE_LABELS[typeFilter]}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((key) => (
                            <DropdownMenuItem key={key} onClick={() => setTypeFilter(key)}>
                                {TYPE_LABELS[key]}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="space-y-2">
                {/* "Sans dossier" section */}
                {rootFiles.length > 0 && (
                    <div
                        className={cn(
                            "rounded-xl border overflow-hidden",
                            !isFiltered && overTarget === "root" ? "border-violet-500" : "border-border"
                        )}
                        onDragOver={!isFiltered ? (e) => handleDragOver(e, "root") : undefined}
                        onDragLeave={!isFiltered ? handleDragLeave : undefined}
                        onDrop={!isFiltered ? (e) => handleDrop(e, null) : undefined}
                    >
                        <div className={cn(
                            "px-4 py-2 border-b border-border",
                            !isFiltered && overTarget === "root" ? "bg-violet-500/10" : "bg-muted/30"
                        )}>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Sans dossier
                            </span>
                        </div>
                        {rootFiles.map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                folders={folders}
                                isDraggable={!isFiltered}
                                isBeingDragged={draggingId === file.id}
                                onDownload={onDownload}
                                onDelete={onDeleteFile}
                                onMove={onMoveFile}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                )}

                {/* Folder sections */}
                {visibleFolders.map((folder) => {
                    const folderFiles = sortFiles(
                        filteredFiles.filter((f) => f.folder_id === folder.id),
                        sort
                    );
                    const isExpanded = expandedFolders[folder.id] ?? false;
                    const totalSize = folderFiles.reduce((s, f) => s + (f.size ?? 0), 0);
                    const isOver = !isFiltered && overTarget === folder.id;

                    return (
                        <div
                            key={folder.id}
                            className={cn(
                                "rounded-xl border overflow-hidden",
                                isOver ? "border-violet-500" : "border-border"
                            )}
                            onDragOver={!isFiltered ? (e) => handleDragOver(e, folder.id) : undefined}
                            onDragLeave={!isFiltered ? handleDragLeave : undefined}
                            onDrop={!isFiltered ? (e) => handleDrop(e, folder.id) : undefined}
                        >
                            {/* Folder header */}
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group",
                                    isOver ? "bg-violet-500/10" : "hover:bg-muted/30"
                                )}
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
                                            <DropdownMenuSeparator />
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
                                                isDraggable={!isFiltered}
                                                isBeingDragged={draggingId === file.id}
                                                onDownload={onDownload}
                                                onDelete={onDeleteFile}
                                                onMove={onMoveFile}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Empty state */}
                {rootFiles.length === 0 && visibleFolders.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                        {isFiltered
                            ? "Aucun fichier ne correspond à votre recherche."
                            : "Aucun fichier pour l\u2019instant. Uploadez un fichier ou ajoutez un lien."
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
