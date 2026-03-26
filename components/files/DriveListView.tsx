"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronDown, ChevronRight, Folder, Link2, FileUp,
    Download, ExternalLink, MoreHorizontal, GripVertical, Search,
    ArrowUp, ArrowDown, ArrowUpDown
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

const TYPE_LABELS: Record<TypeFilter, string> = {
    all: "Tous",
    upload: "Fichiers",
    link: "Liens",
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

// Helper to determine the file type
function getFileType(file: FileRecord) {
    if (file.type === "link") return "Lien";
    const ext = file.name.split('.').pop();
    return ext ? ext.toUpperCase() : "Fichier";
}

// Helper to format the date safely
function formatDate(dateString?: string | Date) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric"
    });
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
        <tr
            className={cn(
                "border-b border-border hover:bg-muted/40 transition-colors group",
                isBeingDragged && "opacity-50 bg-muted/20"
            )}
            draggable={isDraggable}
            onDragStart={isDraggable ? (e) => onDragStart(e, file.id) : undefined}
            onDragEnd={isDraggable ? onDragEnd : undefined}
        >
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
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
                        className="text-sm font-medium text-left truncate hover:underline max-w-[150px] sm:max-w-[250px]"
                        onClick={() => onDownload(file)}
                    >
                        {file.name}
                    </button>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{getFileType(file)}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{file.size ? formatBytes(file.size) : "—"}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(file.created_at)}</td>

            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                <DropdownMenuItem key={f.id} disabled={file.folder_id === f.id} onClick={() => onMove(file.id, f.id)}>
                                    Déplacer vers « {f.name} »
                                </DropdownMenuItem>
                            ))}
                            {file.folder_id !== null && (
                                <DropdownMenuItem onClick={() => onMove(file.id, null)}>
                                    Déplacer à la racine
                                </DropdownMenuItem>
                            )}
                            {(folders.length > 0 || file.folder_id !== null) && <DropdownMenuSeparator />}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(file.id)}>
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    );
}

export function DriveListView({
    files: serverFiles, folders, expandedFolders,
    onToggleFolder, onDownload, onDeleteFile, onMoveFile, onRenameFolder, onDeleteFolder,
}: DriveListViewProps) {
    const [localFiles, setLocalFiles] = useState<FileRecord[]>(serverFiles);

    useEffect(() => {
        setLocalFiles(serverFiles);
    }, [serverFiles]);

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortKey>("date-desc");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overTarget, setOverTarget] = useState<string | null>(null);

    const isFiltered = search.trim() !== "" || typeFilter !== "all";

    const filteredFiles = filterFiles(localFiles, search, typeFilter);
    const rootFiles = sortFiles(filteredFiles.filter((f) => f.folder_id === null), sort);
    const visibleFolders = isFiltered
        ? folders.filter((folder) => filteredFiles.some((f) => f.folder_id === folder.id))
        : folders;

    const handleOptimisticMove = (fileId: string, targetFolderId: string | null) => {
        setLocalFiles(prev => prev.map(f => f.id === fileId ? { ...f, folder_id: targetFolderId } : f));
        onMoveFile(fileId, targetFolderId);
    };

    // --- Drag and Drop Handlers ---
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

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setOverTarget(null);
        }
    };

    const handleDrop = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        const fileId = e.dataTransfer.getData("fileId");
        if (fileId) {
            handleOptimisticMove(fileId, folderId);
        }
        setDraggingId(null);
        setOverTarget(null);
    };

    // --- Column Sorting Handler ---
    const handleSortChange = (columnBase: "name" | "type" | "size" | "date") => {
        if (sort === `${columnBase}-asc`) {
            setSort(`${columnBase}-desc` as SortKey);
        } else {
            setSort(`${columnBase}-asc` as SortKey);
        }
    };

    // Helper to render sort icons
    const renderSortIcon = (columnBase: "name" | "type" | "size" | "date") => {
        if (sort === `${columnBase}-asc`) return <ArrowUp className="w-3.5 h-3.5 ml-1 text-foreground" />;
        if (sort === `${columnBase}-desc`) return <ArrowDown className="w-3.5 h-3.5 ml-1 text-foreground" />;
        return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar without sort dropdown */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        className="pl-9 bg-muted/30 border-muted"
                        placeholder="Rechercher un fichier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-muted/50 p-1 rounded-lg shrink-0 w-full sm:w-auto overflow-x-auto">
                        {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((key) => (
                            <button
                                key={key}
                                onClick={() => setTypeFilter(key)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none",
                                    typeFilter === key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {TYPE_LABELS[key]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider select-none">
                        <tr>
                            <th className="px-4 py-3 font-semibold border-b w-[40%] cursor-pointer group hover:bg-muted/60 transition-colors" onClick={() => handleSortChange("name")}>
                                <div className="flex items-center">
                                    Nom {renderSortIcon("name")}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-semibold border-b w-[15%] cursor-pointer group hover:bg-muted/60 transition-colors" onClick={() => handleSortChange("type")}>
                                <div className="flex items-center">
                                    Type {renderSortIcon("type")}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-semibold border-b w-[15%] cursor-pointer group hover:bg-muted/60 transition-colors" onClick={() => handleSortChange("size")}>
                                <div className="flex items-center">
                                    Taille {renderSortIcon("size")}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-semibold border-b w-[20%] cursor-pointer group hover:bg-muted/60 transition-colors" onClick={() => handleSortChange("date")}>
                                <div className="flex items-center">
                                    Date {renderSortIcon("date")}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-semibold border-b w-[10%] text-right">Actions</th>
                        </tr>
                    </thead>
                    {/* Make the root table body droppable for moving items back to root without needing the visual row */}
                    <tbody
                        onDragOver={!isFiltered ? (e) => handleDragOver(e, "root") : undefined}
                        onDragLeave={!isFiltered ? handleDragLeave : undefined}
                        onDrop={!isFiltered ? (e) => handleDrop(e, null) : undefined}
                        className={cn(!isFiltered && overTarget === "root" && "bg-primary/5")}
                    >
                        {/* Root Files - Rendered immediately without "Sans dossier" row */}
                        {rootFiles.map((file) => (
                            <FileRow
                                key={file.id} file={file} folders={folders}
                                isDraggable={!isFiltered} isBeingDragged={!isFiltered && draggingId === file.id}
                                onDownload={onDownload} onDelete={onDeleteFile}
                                onMove={handleOptimisticMove}
                                onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* Folders */}
                        {visibleFolders.map((folder) => {
                            const folderFiles = sortFiles(filteredFiles.filter((f) => f.folder_id === folder.id), sort);
                            const isExpanded = expandedFolders[folder.id] ?? false;
                            const totalSize = folderFiles.reduce((s, f) => s + (f.size ?? 0), 0);
                            const isOver = !isFiltered && overTarget === folder.id;

                            return (
                                <React.Fragment key={folder.id}>
                                    <tr
                                        className={cn("border-b hover:bg-muted/30 cursor-pointer group bg-card", isOver && "bg-primary/10")}
                                        onClick={() => onToggleFolder(folder.id)}
                                        onDragOver={!isFiltered ? (e) => { e.stopPropagation(); handleDragOver(e, folder.id); } : undefined}
                                        onDragLeave={!isFiltered ? handleDragLeave : undefined}
                                        onDrop={!isFiltered ? (e) => { e.stopPropagation(); handleDrop(e, folder.id); } : undefined}                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                <Folder className={cn("w-4 h-4", isExpanded ? "text-indigo-500 fill-indigo-500/20" : "text-muted-foreground")} />
                                                <span className="font-medium text-sm">{folder.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">Dossier</td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{totalSize > 0 ? formatBytes(totalSize) : "—"}</td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(folder.created_at)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => onRenameFolder(folder)}>Renommer</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteFolder(folder.id)}>Supprimer</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Folder Files */}
                                    {isExpanded && folderFiles.length === 0 && (
                                        <tr><td colSpan={5} className="px-10 py-4 text-sm text-muted-foreground bg-muted/5 border-b">Dossier vide.</td></tr>
                                    )}
                                    {isExpanded && folderFiles.map((file) => (
                                        <FileRow
                                            key={file.id} file={file} folders={folders}
                                            isDraggable={!isFiltered} isBeingDragged={!isFiltered && draggingId === file.id}
                                            onDownload={onDownload} onDelete={onDeleteFile}
                                            onMove={handleOptimisticMove}
                                            onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                                        />
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {rootFiles.length === 0 && visibleFolders.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground text-sm border-t">
                        {isFiltered ? "Aucun fichier ne correspond à votre recherche." : "Aucun fichier pour l’instant."}
                    </div>
                )}
            </div>
        </div>
    );
}