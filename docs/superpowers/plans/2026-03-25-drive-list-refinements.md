# Drive List Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the grid view, add search/sort/filter toolbar and drag-and-drop to the list view, and widen the Drive page.

**Architecture:** All changes are pure UI — no new server actions needed. Client-side filtering/sorting is extracted into a small utility module (`driveUtils.ts`) so it can be unit tested independently. DriveListView owns the toolbar and DnD state internally. DriveClient and DriveHeader are simplified by removing all grid-related code.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui (Button, Input, DropdownMenu), Lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-25-drive-list-refinements-design.md`

---

## File Map

| Action | Path |
|--------|------|
| Delete | `components/files/DriveGridView.tsx` |
| Modify | `components/files/DriveHeader.tsx` |
| Modify | `components/files/DriveClient.tsx` |
| Create | `components/files/driveUtils.ts` |
| Modify | `vitest.config.ts` |
| Create | `__tests__/unit/drive/driveUtils.test.ts` |
| Modify | `components/files/DriveListView.tsx` |
| Modify | `app/app/files/page.tsx` |

---

### Task 1: Remove grid view

Remove DriveGridView and all references to it. No tests needed — this is pure deletion.

**Files:**
- Delete: `components/files/DriveGridView.tsx`
- Modify: `components/files/DriveHeader.tsx` (lines 1–74)
- Modify: `components/files/DriveClient.tsx` (lines 1–198)

- [ ] **Step 1: Delete DriveGridView.tsx**

```bash
rm components/files/DriveGridView.tsx
```

- [ ] **Step 2: Rewrite DriveHeader.tsx — remove view toggle**

Replace the entire file with:

```tsx
"use client";

import { FolderPlus, FileUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DriveHeaderProps {
    usedBytes: number;
    limitBytes: number;
    onNewFolder: () => void;
    onUpload: () => void;
    onAddLink: () => void;
}

export function DriveHeader({ usedBytes, limitBytes, onNewFolder, onUpload, onAddLink }: DriveHeaderProps) {
    const pct = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
    const usedMo = Math.round(usedBytes / (1024 * 1024));
    const limitGo = (limitBytes / (1024 * 1024 * 1024)).toFixed(0);

    const barColor = pct > 95 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-violet-500";

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card mb-6">
            {/* Storage bar */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Stockage</span>
                    <span>{usedMo} Mo / {limitGo} Go</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={onNewFolder}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Dossier
                </Button>
                <Button variant="outline" size="sm" onClick={onAddLink}>
                    <Link2 className="w-4 h-4 mr-1.5" /> Lien
                </Button>
                <Button size="sm" onClick={onUpload}>
                    <FileUp className="w-4 h-4 mr-1.5" /> Fichier
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Rewrite DriveClient.tsx — remove view state, handleFolderClick, DriveGridView**

Replace the entire file with:

```tsx
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
```

- [ ] **Step 4: Run tests to confirm nothing is broken**

```bash
npm run test:run
```

Expected: 189 tests passing (same as before).

- [ ] **Step 5: Commit**

```bash
git add components/files/DriveHeader.tsx components/files/DriveClient.tsx
git commit -m "refactor: remove grid view from Drive — delete DriveGridView, simplify DriveHeader and DriveClient"
```

Note: `DriveGridView.tsx` is already deleted with the `rm` command in step 1. Git will pick it up as a deletion in the commit.

---

### Task 2: Drive filter/sort utilities + tests

Extract filtering and sorting into a pure utility module so they can be tested independently of the DOM.

**Files:**
- Create: `components/files/driveUtils.ts`
- Modify: `vitest.config.ts` (add `components/files/driveUtils.ts` to coverage include)
- Create: `__tests__/unit/drive/driveUtils.test.ts`

**Important type note:** `FileRecord.type` is `"upload" | "link"` (not `"file"`). This is defined in `actions/files.server.ts:32`.

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/unit/drive/driveUtils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterFiles, sortFiles } from "@/components/files/driveUtils";
import type { FileRecord } from "@/actions/files.server";

function makeFile(overrides: Partial<FileRecord> = {}): FileRecord {
    return {
        id: "1",
        agency_id: "agency-1",
        project_id: null,
        type: "upload",
        name: "test.pdf",
        storage_path: null,
        url: null,
        size: null,
        mime_type: null,
        uploaded_by: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        folder_id: null,
        uploader: null,
        ...overrides,
    };
}

describe("filterFiles", () => {
    it("returns all files when search is empty and typeFilter is 'all'", () => {
        const files = [makeFile({ name: "a.pdf" }), makeFile({ name: "b.pdf" })];
        expect(filterFiles(files, "", "all")).toHaveLength(2);
    });

    it("filters by name case-insensitively", () => {
        const files = [makeFile({ name: "Contrat.pdf" }), makeFile({ name: "Devis.pdf" })];
        const result = filterFiles(files, "contrat", "all");
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Contrat.pdf");
    });

    it("returns empty when name does not match", () => {
        const files = [makeFile({ name: "Contrat.pdf" })];
        expect(filterFiles(files, "xyz", "all")).toHaveLength(0);
    });

    it("filters by type 'upload'", () => {
        const files = [makeFile({ type: "upload" }), makeFile({ type: "link" })];
        const result = filterFiles(files, "", "upload");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("upload");
    });

    it("filters by type 'link'", () => {
        const files = [makeFile({ type: "upload" }), makeFile({ type: "link" })];
        const result = filterFiles(files, "", "link");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("link");
    });

    it("applies both search and typeFilter", () => {
        const files = [
            makeFile({ name: "Rapport.pdf", type: "upload" }),
            makeFile({ name: "Rapport Figma", type: "link" }),
        ];
        const result = filterFiles(files, "rapport", "upload");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("upload");
    });
});

describe("sortFiles", () => {
    it("does not mutate the original array", () => {
        const files = [makeFile({ name: "Zebra" }), makeFile({ name: "Alpha" })];
        sortFiles(files, "name-asc");
        expect(files[0].name).toBe("Zebra");
    });

    it("sorts name-asc", () => {
        const files = [makeFile({ name: "Zebra" }), makeFile({ name: "Alpha" }), makeFile({ name: "Mango" })];
        expect(sortFiles(files, "name-asc").map((f) => f.name)).toEqual(["Alpha", "Mango", "Zebra"]);
    });

    it("sorts name-desc", () => {
        const files = [makeFile({ name: "Alpha" }), makeFile({ name: "Zebra" })];
        expect(sortFiles(files, "name-desc").map((f) => f.name)).toEqual(["Zebra", "Alpha"]);
    });

    it("sorts date-desc (most recent first)", () => {
        const files = [
            makeFile({ name: "old", created_at: "2026-01-01T00:00:00Z" }),
            makeFile({ name: "new", created_at: "2026-03-01T00:00:00Z" }),
        ];
        expect(sortFiles(files, "date-desc")[0].name).toBe("new");
    });

    it("sorts date-asc (oldest first)", () => {
        const files = [
            makeFile({ name: "old", created_at: "2026-01-01T00:00:00Z" }),
            makeFile({ name: "new", created_at: "2026-03-01T00:00:00Z" }),
        ];
        expect(sortFiles(files, "date-asc")[0].name).toBe("old");
    });

    it("sorts size-desc (largest first)", () => {
        const files = [makeFile({ name: "small", size: 100 }), makeFile({ name: "large", size: 1000 })];
        expect(sortFiles(files, "size-desc")[0].name).toBe("large");
    });

    it("sorts size-asc (smallest first)", () => {
        const files = [makeFile({ name: "large", size: 1000 }), makeFile({ name: "small", size: 100 })];
        expect(sortFiles(files, "size-asc")[0].name).toBe("small");
    });

    it("treats null size as 0 for size sort", () => {
        const files = [makeFile({ name: "has-size", size: 500 }), makeFile({ name: "no-size", size: null })];
        expect(sortFiles(files, "size-desc")[0].name).toBe("has-size");
        expect(sortFiles(files, "size-asc")[0].name).toBe("no-size");
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- __tests__/unit/drive/driveUtils.test.ts
```

Expected: FAIL — `Cannot find module '@/components/files/driveUtils'`

- [ ] **Step 3: Create `components/files/driveUtils.ts`**

```ts
import type { FileRecord } from "@/actions/files.server";

export type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";
export type TypeFilter = "all" | "upload" | "link";

export function filterFiles(files: FileRecord[], search: string, typeFilter: TypeFilter): FileRecord[] {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (typeFilter !== "all" && f.type !== typeFilter) return false;
        return true;
    });
}

export function sortFiles(files: FileRecord[], sort: SortKey): FileRecord[] {
    return [...files].sort((a, b) => {
        switch (sort) {
            case "name-asc":  return a.name.localeCompare(b.name);
            case "name-desc": return b.name.localeCompare(a.name);
            case "date-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case "date-asc":  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case "size-desc": return (b.size ?? 0) - (a.size ?? 0);
            case "size-asc":  return (a.size ?? 0) - (b.size ?? 0);
            default: return 0;
        }
    });
}
```

- [ ] **Step 4: Add `components/files/driveUtils.ts` to vitest coverage include**

In `vitest.config.ts`, find the `include` array inside the `coverage` config and add the new file:

```ts
include: [
    "lib/notifications/**",
    "lib/billing/**",
    "lib/config/**",
    "lib/email_generator/**",
    "lib/validators/oppotunities.ts",
    "lib/validators/quotes.ts",
    "lib/utils.ts",
    "actions/dashboard.server.ts",
    "components/files/driveUtils.ts",   // ← add this line
    // Add more paths here as you write unit tests for other files.
    // DB-heavy CRUD wrappers (tracking.server.ts, opportunity.client.ts)
    // belong in integration tests and are excluded from this threshold.
],
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm run test:run -- __tests__/unit/drive/driveUtils.test.ts
```

Expected: 15 tests passing.

- [ ] **Step 6: Run full suite to confirm coverage threshold still passes**

```bash
npm run test:run
```

Expected: all tests passing, coverage ≥ 80%.

- [ ] **Step 7: Commit**

```bash
git add components/files/driveUtils.ts __tests__/unit/drive/driveUtils.test.ts vitest.config.ts
git commit -m "feat: add drive filter/sort utilities with tests"
```

---

### Task 3: Rebuild DriveListView with toolbar + drag-and-drop

Replace the existing DriveListView with a version that owns the search/sort/filter toolbar and DnD state internally.

**Files:**
- Modify: `components/files/DriveListView.tsx` (full rewrite)

**Key behaviors:**
- `isFiltered = search.trim() !== "" || typeFilter !== "all"` — when true, DnD is disabled and the drag handle is hidden
- Drop targets: each folder div + "Sans dossier" section header accept drops only when `!isFiltered`
- `onDragEnd` resets `draggingId` and `overTarget` to `null`
- The active type filter button renders with `variant="default"` (filled) vs `variant="outline"` when inactive — gives visual feedback that a filter is on
- Sort default: `"date-desc"` (most recent first, matching the server query order)

- [ ] **Step 1: Rewrite `components/files/DriveListView.tsx`**

Replace the entire file with:

```tsx
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
                            : "Aucun fichier pour l'instant. Uploadez un fichier ou ajoutez un lien."
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run
```

Expected: all 204 tests passing (189 existing + 15 new driveUtils tests).

- [ ] **Step 3: Widen the page — update max-width in `app/app/files/page.tsx`**

Change line 23 from:
```tsx
<div className="max-w-[1400px] mx-auto px-6 py-8">
```
to:
```tsx
<div className="max-w-[1600px] mx-auto px-6 py-8">
```

- [ ] **Step 4: Commit**

```bash
git add components/files/DriveListView.tsx app/app/files/page.tsx
git commit -m "feat: rebuild DriveListView with search/sort/filter toolbar and drag-and-drop"
```
