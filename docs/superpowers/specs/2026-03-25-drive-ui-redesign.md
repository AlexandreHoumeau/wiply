# Drive UI Redesign — Spec

**Date:** 2026-03-25
**Scope:** Workspace Drive page only (`/app/files`). Project-level Files tabs unchanged.

---

## Overview

Redesign the workspace Drive page with:
1. A storage usage bar
2. Flat folder support (one level, no nesting)
3. Two switchable view modes: List (accordion) and Grid (drag & drop)

---

## Data Model Changes

### New migration: `20260325000002_add_folders.sql`

#### New table: `folders`

```sql
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
```

#### Modified table: `files`

```sql
alter table files add column folder_id uuid references folders(id) on delete set null;
```

- `folder_id = null` → file is at root (no folder)
- Only meaningful for workspace files (`project_id IS NULL`). Project-scoped files always have `folder_id = null`.
- When a folder is deleted, the DB `on delete set null` constraint automatically moves all its files back to root — no manual UPDATE step in application code.
- The existing `files` UPDATE RLS policy (`agency_id in (select agency_id from profiles where id = auth.uid())`) already covers the `folder_id` column update — no new policy needed.

---

## Storage Bar

Always visible at the top of the Drive page.

A new server action `getStorageUsage()` (no parameters — resolves agency via `getAuthContext()` internally):
- `usedBytes`: sum of `size` from `files` where `agency_id = agencyId` and `type = 'upload'`, fetched via `supabaseAdmin`
- `limitBytes`: resolved via the existing `getAgencyPlan(agencyId)` helper (already in `lib/billing/checkLimit.ts`), then `PLANS[plan].max_storage_bytes` — never hardcode
- To avoid duplicating the sum query: extract it as `getUsedStorageBytes(agencyId: string): Promise<number>` in `lib/billing/checkLimit.ts` and use it in both `getStorageUsage` and `checkStorageLimit`

The Drive page fetches this server-side and passes it as a prop to `DriveClient`.

UI:
- Gradient progress bar (indigo → violet); shifts to amber >80%, red >95%
- Label: `{usedMo} Mo / {limitGo} Go`
- Action buttons: `+ Dossier`, `+ Fichier`, `+ Lien`
- View toggle (List / Grid) in the same bar

The existing `/app/files` PRO plan guard (`isProPlan` redirect) is preserved unchanged.

---

## View Modes

### List view (default)

- **Root files section**: files with `folder_id = null`, flat list with name, size, actions
- **Folder sections**: one collapsible accordion per folder
  - Header: folder icon, name, file count + total size (computed client-side from the `files` array — no DB aggregation), `···` menu (rename, delete)
  - Expanded: flat list of files inside that folder
  - State: collapsed by default; expand/collapse persisted in `localStorage` as `Record<string, boolean>` keyed by folder ID. In `DriveClient`, initialized to `{}` (SSR-safe), then populated from `localStorage` in a `useEffect` after mount. `onFolderClick` (from Grid view) sets the entry in both in-memory state and `localStorage` immediately, then switches view to list.
- Row actions: download/open, move to folder (select dropdown listing all folders + "Racine"), delete
- Clicking a file name opens/downloads it

### Grid view

- **Folders row**: folder cards in a 4-column responsive grid (name + file count)
  - Includes a permanent **"Racine" card** (styled with dashed border) as the drop target for moving a file back to root (`folder_id = null`)
  - Clicking any folder card: switches to List view and auto-expands that folder's section
- **Files section**: file cards below folders (name, size, type icon)
  - HTML5 drag-and-drop: `draggable`, `onDragStart`, `onDragOver`, `onDrop` on target cards
  - On drag start: `opacity: 0.5` + `rotate(-2deg)` on dragged card
  - On drag over a folder or Racine card: violet dashed highlight
  - On drop: calls `moveFileToFolder(fileId, folderId | null)`
- Upload and link always land at root; drag to folder afterwards. Uploading directly into a folder is out of scope.

---

## Server Actions

New actions in `actions/files.server.ts`. All resolve `agencyId` via `getAuthContext()`. All verify entity ownership before mutating (`file.agency_id !== agencyId`, `folder.agency_id !== agencyId`) and return `{ success: false, error }` on violation. All mutations show a `toast.error` on failure in the client.

| Action | Signature | Description |
|--------|-----------|-------------|
| `getStorageUsage` | `() → { usedBytes, limitBytes }` | Current usage + plan limit |
| `getFolders` | `() → FolderRecord[]` | All folders for the agency, ordered by `name` alphabetically |
| `createFolder` | `(name) → { success, data?: FolderRecord, error? }` | Create folder; returns full record including generated `id` |
| `renameFolder` | `(folderId, name) → { success, error? }` | Rename after verifying agency ownership |
| `deleteFolder` | `(folderId) → { success, error? }` | Delete after verifying agency ownership; DB cascade handles files |
| `moveFileToFolder` | `(fileId, folderId \| null) → { success, error? }` | Update `folder_id`; verifies file agency ownership and that `file.project_id IS NULL` (workspace files only) |

**Type changes required in `actions/files.server.ts`:**

```typescript
// New type
export type FolderRecord = {
  id: string;
  agency_id: string;
  name: string;
  created_at: string;
};

// FileRecord: add field
folder_id: string | null;
```

`getAgencyFiles` uses `select('*', ...)` so `folder_id` is returned automatically once the column exists — no query change, only the type update above.

---

## Components

### `DriveHeader` (new)
Stateless. Props: `usedBytes`, `limitBytes`, `view: 'list'|'grid'`, `onViewChange`, `onNewFolder`, `onUpload`, `onAddLink`.

### `DriveClient` (new, `"use client"`)
Owns all mutable state:
- `files: FileRecord[]` — initialized from server props
- `folders: FolderRecord[]` — initialized from server props
- `view: 'list' | 'grid'` — initialized to `'list'`
- `expandedFolders: Record<string, boolean>` — initialized to `{}`, synced to `localStorage` via `useEffect`

Mutation pattern (no React Query — same as existing `FilesTable`):
- `createFolder`: await action → if success, append returned `FolderRecord` (with its real `id`) to `folders` state
- `renameFolder`: await → update `folders` in place
- `deleteFolder`: await → remove folder from `folders`, then update `files` state: `files.map(f => f.folder_id === deletedFolderId ? { ...f, folder_id: null } : f)`
- `moveFileToFolder`: await → update `folder_id` on the file in `files` state
- All failures: `toast.error(result.error ?? 'Erreur')`

Renders `DriveHeader` + `DriveListView` or `DriveGridView` based on `view`.

### `DriveListView` (new)
Receives `files`, `folders`, `expandedFolders`, and callbacks. Purely presentational + local interactions.

### `DriveGridView` (new)
Receives `files`, `folders`, and callbacks. Implements HTML5 drag-and-drop. Calls `onFolderClick(folderId)` which `DriveClient` handles by switching to list view and expanding the folder.

### `CreateFolderDialog` (new)
Modal: text input for folder name, calls `onConfirm(name)`.

### `RenameFolderDialog` (new)
Same, pre-filled with current name.

### `FilesTable` (existing)
Unchanged — still used on project-level Files tabs.

---

## Page: `/app/files`

Refactored server component:
1. Verify PRO plan (existing redirect guard — unchanged)
2. Fetch `files`, `folders`, `storageUsage` in parallel via `Promise.all`
3. Pass all as props to `DriveClient`

---

## Out of Scope

- Nested folders
- Uploading directly into a folder (files always land at root; drag to assign)
- Folder support on project-level Files tabs
- Folder support in TaskFiles panel
- Search/filter within Drive
- File previews
- Multi-select
