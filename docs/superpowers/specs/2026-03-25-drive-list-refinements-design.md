# Drive List Refinements Design

**Date:** 2026-03-25
**Branch:** feature/drive-files

## Goal

Simplify the Drive UI to a single, refined list view: remove the grid view, add search/sort/filter, add drag-and-drop within the list, and increase the page width.

## Scope

This spec covers changes to the workspace-level `/app/files` page only. Project-level files tab and task files panel are not affected.

## Changes

### 1. Remove Grid View

- Delete `components/files/DriveGridView.tsx`
- Remove view toggle buttons from `DriveHeader`
- Remove `view` state (`"list" | "grid"`) and `onViewChange` prop from `DriveHeader`
- Remove `handleFolderClick` from `DriveClient` (was only needed to switch to list view from grid)
- Remove `expandedFolders` localStorage hydration is kept — folder expand/collapse state persists

### 2. Toolbar — Search, Sort, Filter

A single toolbar row rendered inside `DriveListView`, between the storage bar and the file list.

**Components:**
- **Search input** — `<Input>` with search icon. Filters files by name client-side in real time. Folder sections whose files are all hidden by the filter are hidden too.
- **Sort dropdown** — `<Select>` or `<DropdownMenu>`. Options:
  - `name-asc` — Nom A→Z (default)
  - `name-desc` — Nom Z→A
  - `date-desc` — Date (récent)
  - `date-asc` — Date (ancien)
  - `size-desc` — Taille (↓)
  - `size-asc` — Taille (↑)
  - Folders always sort alphabetically regardless of the selected sort. Sort applies to files within each section.
- **Type filter dropdown** — Options: Tous, Fichiers, Liens. Filters out file rows of the non-selected type.

**Behavior when filters/search are active:**
- Folder sections with zero matching files are hidden
- "Sans dossier" section is hidden if it has zero matching files
- Drag-and-drop is **disabled** when search or type filter is active (avoids confusing disappearing rows)

### 3. Drag & Drop in List View

File rows in `DriveListView` become draggable. Folder headers and the "Sans dossier" header become drop targets.

**Drag handle:**
- `GripVertical` icon (lucide) on the left of each file row
- Visible on row hover only (`opacity-0 group-hover:opacity-100`)
- `draggable` attribute set on the file row div
- Only appears when no search/filter is active

**Drop targets:**
- Each folder header — dropping moves the file into that folder (`moveFileToFolder(fileId, folder.id)`)
- "Sans dossier" section header — dropping removes the file from its folder (`moveFileToFolder(fileId, null)`)
- Drop on the file's current location is a no-op

**Visual feedback:**
- Dragging file row: `opacity-50` on the source row
- Hover over a valid drop target: violet border + violet background tint (`border-violet-500 bg-violet-500/10`)
- Use HTML5 drag-and-drop API (`onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`, `onDragEnd`) — same pattern as `DriveGridView` (which is being removed). `onDragEnd` resets `draggingId` and `overTarget` to `null` when a drag ends without landing on a valid target.

**State:**
- `draggingId: string | null` — ID of the file being dragged
- `overTarget: string | null` — folder ID or `"root"` for the "Sans dossier" target

### 4. Page Width

Change `max-w-[1400px]` to `max-w-[1600px]` in `app/app/files/page.tsx`.

## Files Changed

| Action | Path |
|--------|------|
| Delete | `components/files/DriveGridView.tsx` |
| Modify | `components/files/DriveHeader.tsx` — remove view toggle |
| Modify | `components/files/DriveClient.tsx` — remove `view` state, `handleFolderClick`, `DriveGridView` import and render branch |
| Modify | `components/files/DriveListView.tsx` — add search/sort/filter toolbar + DnD |
| Modify | `app/app/files/page.tsx` — increase max-width |

## Architecture Notes

- All filtering and sorting is **client-side** — no new server actions needed
- `DriveListView` receives `files` and `folders` as before; it owns the `search`, `sort`, `typeFilter`, `draggingId`, and `overTarget` state internally (these are pure UI concerns, not shared upward)
- `onMoveFile` callback from `DriveClient` is still used for DnD drops — no change to the server action interface
- The toolbar lives inside `DriveListView` to keep `DriveClient` clean

## Non-Goals

- No server-side search or pagination
- No multi-select or bulk move
- No reordering within a folder (files are not ordered)
- No changes to project-level files or task files panels
