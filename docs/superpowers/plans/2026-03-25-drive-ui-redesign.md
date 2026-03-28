# Drive UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the workspace Drive page with a storage usage bar, flat folder support, and two view modes (accordion list + drag-and-drop grid).

**Architecture:** A new `DriveClient` client component owns all mutable state (files, folders, view mode) and is fed initial data from the refactored server page. Two presentational view components (`DriveListView`, `DriveGridView`) receive data + callbacks and never fetch independently. The database gets a new `folders` table and a `folder_id` FK column on `files`.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), React `useState`, HTML5 drag-and-drop API, Tailwind CSS, shadcn/ui, Vitest for tests.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260325000002_add_folders.sql` | Create | `folders` table + `files.folder_id` column |
| `lib/billing/checkLimit.ts` | Modify | Extract `getUsedStorageBytes` shared helper |
| `actions/files.server.ts` | Modify | Add `FolderRecord` type, `folder_id` to `FileRecord`, add 6 new actions |
| `components/files/DriveHeader.tsx` | Create | Stateless: storage bar + buttons + view toggle |
| `components/files/CreateFolderDialog.tsx` | Create | Modal: create folder by name |
| `components/files/RenameFolderDialog.tsx` | Create | Modal: rename folder |
| `components/files/DriveListView.tsx` | Create | Accordion list: root files + per-folder sections |
| `components/files/DriveGridView.tsx` | Create | Grid: folder cards + file cards + HTML5 drag-and-drop |
| `components/files/DriveClient.tsx` | Create | State owner: wires header + views + mutations |
| `app/app/files/page.tsx` | Modify | Fetch files + folders + storage, pass to DriveClient |
| `__tests__/unit/billing/getStorageUsage.test.ts` | Create | Unit tests for `getUsedStorageBytes` |
| `__tests__/actions/folders.test.ts` | Create | Unit tests for folder server actions |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260325000002_add_folders.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260325000002_add_folders.sql

create table folders (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table folders enable row level security;

create policy "agency members can read their folders"
  on folders for select
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can insert folders"
  on folders for insert
  with check (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can update their folders"
  on folders for update
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

create policy "agency members can delete their folders"
  on folders for delete
  using (agency_id in (select agency_id from profiles where id = auth.uid()));

-- Add folder_id to files. NULL = root (no folder).
-- on delete set null: deleting a folder moves its files to root automatically.
alter table files add column folder_id uuid references folders(id) on delete set null;
```

- [ ] **Step 2: Push the migration to remote**

```bash
npx supabase db push
```

Expected: migration applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260325000002_add_folders.sql
git commit -m "feat: add folders table and files.folder_id migration"
```

---

## Task 2: Extract `getUsedStorageBytes` billing helper

**Files:**
- Modify: `lib/billing/checkLimit.ts`
- Create: `__tests__/unit/billing/getStorageUsage.test.ts`

The `checkStorageLimit` function currently inlines the used-bytes query. Extract it so `getStorageUsage` (Task 3) can share the logic without duplication.

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/billing/getStorageUsage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUsedStorageBytes } from "@/lib/billing/checkLimit";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/lib/supabase/admin";

beforeEach(() => vi.clearAllMocks());

describe("getUsedStorageBytes", () => {
  it("sums sizes of all upload files for the agency", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({
      data: [{ size: 1024 * 1024 }, { size: 2 * 1024 * 1024 }],
      error: null,
    });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(3 * 1024 * 1024); // 3 MB
  });

  it("returns 0 when no upload files exist", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({ data: [], error: null });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(0);
  });

  it("treats null size as 0", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({
      data: [{ size: null }, { size: 500 }],
      error: null,
    });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(500);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (function not exported yet)**

```bash
npm test -- --run __tests__/unit/billing/getStorageUsage.test.ts
```

Expected: FAIL with "getUsedStorageBytes is not a function" or import error.

- [ ] **Step 3: Extract the helper and refactor `checkStorageLimit`**

In `lib/billing/checkLimit.ts`, add the exported helper and use it in `checkStorageLimit`:

```typescript
// Add this export near the top of the file, after imports:
export async function getUsedStorageBytes(agencyId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
        .from('files')
        .select('size')
        .eq('agency_id', agencyId)
        .eq('type', 'upload')

    if (error) throw error
    return (data ?? []).reduce((sum: number, row: { size: number | null }) => sum + (row.size ?? 0), 0)
}
```

Then replace the inline query in `checkStorageLimit` with a call to it:

```typescript
export async function checkStorageLimit(
    agencyId: string,
    fileSizeBytes: number
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getAgencyPlan(agencyId)
    const limit = PLANS[plan].max_storage_bytes

    const usedBytes = await getUsedStorageBytes(agencyId)

    if (usedBytes + fileSizeBytes > limit) {
        const usedMB = Math.round(usedBytes / (1024 * 1024))
        const limitMB = Math.round(limit / (1024 * 1024))
        return {
            allowed: false,
            reason: `Stockage insuffisant. Utilisé : ${usedMB} Mo / ${limitMB} Mo`
        }
    }
    return { allowed: true }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --run __tests__/unit/billing/getStorageUsage.test.ts
```

- [ ] **Step 5: Verify existing billing tests still pass**

```bash
npm test -- --run __tests__/unit/billing/checkLimit.test.ts
npm test -- --run __tests__/unit/billing/checkFiles.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/billing/checkLimit.ts __tests__/unit/billing/getStorageUsage.test.ts
git commit -m "refactor: extract getUsedStorageBytes from checkStorageLimit"
```

---

## Task 3: Types and server actions for folders

**Files:**
- Modify: `actions/files.server.ts`
- Create: `__tests__/actions/folders.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/actions/folders.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/billing/checkLimit", () => ({
    getUsedStorageBytes: vi.fn().mockResolvedValue(0),
}));

import { createClient } from "@/lib/supabase/server";
import {
    getFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFileToFolder,
    getStorageUsage,
} from "@/actions/files.server";

/** Minimal supabase chain builder */
function makeChain(result: any) {
    const chain: any = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve(result)),
    };
    const p = Promise.resolve(result);
    chain.then = p.then.bind(p);
    chain.catch = p.catch.bind(p);
    chain.finally = p.finally.bind(p);
    return chain;
}

function makeSupabase(config: {
    profileData?: any;
    agencyData?: any;
    tableResults?: Record<string, any>;
}) {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "user-1" } },
                error: null,
            }),
        },
        from: vi.fn((table: string) => {
            if (table === "profiles") {
                return makeChain({ data: { agency_id: "agency-1" }, error: null });
            }
            if (table === "agencies") {
                return makeChain({ data: config.agencyData ?? { plan: "PRO" }, error: null });
            }
            const result = config.tableResults?.[table] ?? { data: [], error: null };
            return makeChain(result);
        }),
    };
}

beforeEach(() => vi.clearAllMocks());

describe("getFolders", () => {
    it("returns folders for the agency", async () => {
        const folders = [
            { id: "f-1", agency_id: "agency-1", name: "Maquettes", created_at: "2026-01-01" },
        ];
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({ tableResults: { folders: { data: folders, error: null } } }) as any
        );
        const result = await getFolders();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data![0].name).toBe("Maquettes");
    });
});

describe("createFolder", () => {
    it("creates a folder and returns the record", async () => {
        const newFolder = { id: "f-2", agency_id: "agency-1", name: "Contrats", created_at: "2026-01-01" };
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({ tableResults: { folders: { data: newFolder, error: null } } }) as any
        );
        const result = await createFolder("Contrats");
        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("f-2");
    });

    it("rejects empty folder name", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({}) as any
        );
        const result = await createFolder("   ");
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe("renameFolder", () => {
    it("rejects rename for folder that belongs to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    folders: { data: { agency_id: "other-agency" }, error: null },
                },
            }) as any
        );
        const result = await renameFolder("f-1", "Nouveau nom");
        expect(result.success).toBe(false);
    });
});

describe("deleteFolder", () => {
    it("rejects delete for folder that belongs to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    folders: { data: { agency_id: "other-agency" }, error: null },
                },
            }) as any
        );
        const result = await deleteFolder("f-1");
        expect(result.success).toBe(false);
    });
});

describe("moveFileToFolder", () => {
    it("rejects move for file belonging to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    files: { data: { agency_id: "other-agency", project_id: null }, error: null },
                },
            }) as any
        );
        const result = await moveFileToFolder("file-1", "folder-1");
        expect(result.success).toBe(false);
    });

    it("rejects move for project-scoped file", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    files: { data: { agency_id: "agency-1", project_id: "proj-1" }, error: null },
                },
            }) as any
        );
        const result = await moveFileToFolder("file-1", "folder-1");
        expect(result.success).toBe(false);
        expect(result.error).toContain("projet");
    });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- --run __tests__/actions/folders.test.ts
```

Expected: import errors — actions don't exist yet.

- [ ] **Step 3: Update types in `actions/files.server.ts`**

Add `FolderRecord` type and `folder_id` to `FileRecord`:

```typescript
export type FolderRecord = {
    id: string;
    agency_id: string;
    name: string;
    created_at: string;
};

// In FileRecord, add:
folder_id: string | null;
```

- [ ] **Step 4: Add `getStorageUsage` action to `actions/files.server.ts`**

Add this import at the top of the file (alongside the existing `checkFilesEnabled` import):

```typescript
import { getUsedStorageBytes } from "@/lib/billing/checkLimit";
import { PLANS } from "@/lib/config/plans";
```

Then add the action:

```typescript
export async function getStorageUsage(): Promise<{ success: boolean; data?: { usedBytes: number; limitBytes: number }; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const usedBytes = await getUsedStorageBytes(agencyId);
        // getAgencyPlan is private in checkLimit.ts — inline the 3-line plan resolution here.
        const { data } = await supabase.from("agencies").select("plan, demo_ends_at").eq("id", agencyId).single();
        const plan = (data?.demo_ends_at && new Date(data.demo_ends_at) > new Date()) ? "PRO" : ((data?.plan as keyof typeof PLANS) || "FREE");
        const limitBytes = PLANS[plan].max_storage_bytes;
        return { success: true, data: { usedBytes, limitBytes } };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
```

- [ ] **Step 5: Add folder CRUD actions to `actions/files.server.ts`**

```typescript
// ─── Folders ─────────────────────────────────────────────────────────────────

export async function getFolders(): Promise<{ success: boolean; data?: FolderRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("folders")
            .select("*")
            .eq("agency_id", agencyId)
            .order("name", { ascending: true });
        if (error) throw error;
        return { success: true, data: (data ?? []) as FolderRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createFolder(name: string): Promise<{ success: boolean; data?: FolderRecord; error?: string }> {
    try {
        const trimmed = name.trim();
        if (!trimmed) return { success: false, error: "Le nom du dossier ne peut pas être vide" };
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("folders")
            .insert({ agency_id: agencyId, name: trimmed })
            .select("*")
            .single();
        if (error) throw error;
        return { success: true, data: data as FolderRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function renameFolder(folderId: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
        const trimmed = name.trim();
        if (!trimmed) return { success: false, error: "Le nom du dossier ne peut pas être vide" };
        const { supabase, agencyId } = await getAuthContext();
        const { data: folder } = await supabase.from("folders").select("agency_id").eq("id", folderId).single();
        if (!folder || folder.agency_id !== agencyId) return { success: false, error: "Dossier introuvable" };
        const { error } = await supabase.from("folders").update({ name: trimmed }).eq("id", folderId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data: folder } = await supabase.from("folders").select("agency_id").eq("id", folderId).single();
        if (!folder || folder.agency_id !== agencyId) return { success: false, error: "Dossier introuvable" };
        // Files with folder_id = folderId are automatically set to NULL by the FK constraint on delete.
        const { error } = await supabase.from("folders").delete().eq("id", folderId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function moveFileToFolder(fileId: string, folderId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data: file } = await supabase.from("files").select("agency_id, project_id").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };
        if (file.project_id !== null) return { success: false, error: "Impossible de déplacer un fichier lié à un projet dans un dossier" };
        const { error } = await supabase.from("files").update({ folder_id: folderId }).eq("id", fileId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- --run __tests__/actions/folders.test.ts
```

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 8: Add new test files to coverage tracking in `vitest.config.ts`**

Open `vitest.config.ts` and find the `include` array inside the coverage config. Add both new test file paths to it:
- `"__tests__/unit/billing/getStorageUsage.test.ts"`
- `"__tests__/actions/folders.test.ts"`

- [ ] **Step 9: Commit**

```bash
git add actions/files.server.ts __tests__/actions/folders.test.ts vitest.config.ts
git commit -m "feat: add folder types and server actions (getFolders, createFolder, renameFolder, deleteFolder, moveFileToFolder, getStorageUsage)"
```

---

## Task 4: `DriveHeader` component

**Files:**
- Create: `components/files/DriveHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { FolderPlus, FileUp, Link2, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DriveHeaderProps {
    usedBytes: number;
    limitBytes: number;
    view: "list" | "grid";
    onViewChange: (v: "list" | "grid") => void;
    onNewFolder: () => void;
    onUpload: () => void;
    onAddLink: () => void;
}

export function DriveHeader({ usedBytes, limitBytes, view, onViewChange, onNewFolder, onUpload, onAddLink }: DriveHeaderProps) {
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

                {/* View toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden ml-2">
                    <button
                        className={cn("p-1.5 transition-colors", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange("list")}
                        title="Vue liste"
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                        className={cn("p-1.5 transition-colors", view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange("grid")}
                        title="Vue grille"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/files/DriveHeader.tsx
git commit -m "feat: add DriveHeader component (storage bar, actions, view toggle)"
```

---

## Task 5: Folder dialogs

**Files:**
- Create: `components/files/CreateFolderDialog.tsx`
- Create: `components/files/RenameFolderDialog.tsx`

- [ ] **Step 1: Create `CreateFolderDialog`**

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (name: string) => Promise<void>;
}

export function CreateFolderDialog({ open, onOpenChange, onConfirm }: CreateFolderDialogProps) {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsLoading(true);
        await onConfirm(name.trim());
        setIsLoading(false);
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Nouveau dossier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="folder-name">Nom du dossier</Label>
                        <Input
                            id="folder-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Maquettes, Contrats…"
                            autoFocus
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={!name.trim() || isLoading}>
                            {isLoading ? "Création…" : "Créer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Create `RenameFolderDialog`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    onConfirm: (name: string) => Promise<void>;
}

export function RenameFolderDialog({ open, onOpenChange, currentName, onConfirm }: RenameFolderDialogProps) {
    const [name, setName] = useState(currentName);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { if (open) setName(currentName); }, [open, currentName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.trim() === currentName) { onOpenChange(false); return; }
        setIsLoading(true);
        await onConfirm(name.trim());
        setIsLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Renommer le dossier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-folder">Nouveau nom</Label>
                        <Input
                            id="rename-folder"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={!name.trim() || isLoading}>
                            {isLoading ? "Renommage…" : "Renommer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/files/CreateFolderDialog.tsx components/files/RenameFolderDialog.tsx
git commit -m "feat: add CreateFolderDialog and RenameFolderDialog"
```

---

## Task 6: `DriveListView` component

**Files:**
- Create: `components/files/DriveListView.tsx`

This component renders the accordion list: a "root" section for unfiled files and one collapsible section per folder. It is purely presentational — no server calls, no state.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, Link2, FileUp, Trash2, Download, ExternalLink, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
```

- [ ] **Step 2: Commit**

```bash
git add components/files/DriveListView.tsx
git commit -m "feat: add DriveListView accordion component"
```

---

## Task 7: `DriveGridView` component

**Files:**
- Create: `components/files/DriveGridView.tsx`

Uses HTML5 drag-and-drop API. Folder cards are drop targets. A permanent "Racine" card handles drop-to-root. Clicking a folder card triggers `onFolderClick`.

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/files/DriveGridView.tsx
git commit -m "feat: add DriveGridView component with HTML5 drag-and-drop"
```

---

## Task 8: `DriveClient` — state owner

**Files:**
- Create: `components/files/DriveClient.tsx`

Owns all mutable state. Wires all child components together. Uses the same `toast.error` / local state update pattern as `FilesTable`.

- [ ] **Step 1: Create the component**

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
import { DriveGridView } from "./DriveGridView";
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
    const [view, setView] = useState<"list" | "grid">("list");
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
            if (result.success && result.url) { tab!.location.href = result.url; }
            else { tab?.close(); toast.error("Impossible de générer le lien"); }
        }
    };

    // ── Toggle / folder-click ──────────────────────────────────────────────

    const handleToggleFolder = (folderId: string) => {
        const next = { ...expandedFolders, [folderId]: !expandedFolders[folderId] };
        saveExpanded(next);
    };

    const handleFolderClick = (folderId: string) => {
        // From grid view: switch to list and expand that folder
        const next = { ...expandedFolders, [folderId]: true };
        saveExpanded(next);
        setView("list");
    };

    return (
        <div>
            <DriveHeader
                usedBytes={usedBytes}
                limitBytes={limitBytes}
                view={view}
                onViewChange={setView}
                onNewFolder={() => setCreateFolderOpen(true)}
                onUpload={() => setUploadOpen(true)}
                onAddLink={() => setLinkOpen(true)}
            />

            {view === "list" ? (
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
            ) : (
                <DriveGridView
                    files={files}
                    folders={folders}
                    onMoveFile={handleMoveFile}
                    onFolderClick={handleFolderClick}
                />
            )}

            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                onConfirm={handleCreateFolder}
            />
            {renamingFolder && (
                <RenameFolderDialog
                    open={!!renamingFolder}
                    onOpenChange={(open) => { if (!open) setRenamingFolder(null); }}
                    currentName={renamingFolder.name}
                    onConfirm={handleRenameFolder}
                />
            )}
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

- [ ] **Step 2: Commit**

```bash
git add components/files/DriveClient.tsx
git commit -m "feat: add DriveClient state-owner component"
```

---

## Task 9: Refactor `/app/files` page

**Files:**
- Modify: `app/app/files/page.tsx`

- [ ] **Step 1: Replace the page contents**

```tsx
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
        <div className="max-w-[1400px] mx-auto px-6 py-8">
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
```

- [ ] **Step 2: Run full test suite to check for regressions**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, clean build.

- [ ] **Step 4: Commit**

```bash
git add app/app/files/page.tsx
git commit -m "feat: refactor Drive page to use DriveClient with folders and storage bar"
```

---

## Task 10: Manual verification

- [ ] **Open `/app/files` in the browser**
  - Storage bar renders with usage % and Mo/Go label
  - List view shows existing files in "Sans dossier" section
  - View toggle switches between List and Grid

- [ ] **Create a folder**
  - Click `+ Dossier` → dialog opens → enter name → confirm
  - Folder appears in list view accordion (collapsed)
  - Folder appears as card in grid view

- [ ] **Move a file into a folder (list view)**
  - Hover a file row → click `···` → select "Déplacer vers «X»"
  - File disappears from root, appears under the folder when expanded

- [ ] **Move a file via drag-and-drop (grid view)**
  - Switch to grid view
  - Drag a file card over a folder card — folder highlights violet
  - Drop — file disappears from files grid
  - Click the folder card — switches to list view with folder expanded, file is there

- [ ] **Move file back to root (grid view)**
  - Drag a file from grid onto the "Racine" drop card
  - File moves back to root section in list view

- [ ] **Rename a folder**
  - Hover folder header → `···` → Renommer → confirm new name
  - Folder name updates in place, list re-sorts alphabetically

- [ ] **Delete a folder**
  - `···` → Supprimer le dossier
  - Folder removed; its files move to "Sans dossier"

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: drive UI redesign complete (folders, storage bar, list/grid views)"
```
