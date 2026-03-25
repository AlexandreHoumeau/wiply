# Drive / Files Feature — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Overview

A file management system for Wiply agencies. Files live either at the agency level (workspace-wide) or inside a specific project. Files can also be linked to individual tasks. The feature supports both binary uploads (stored in Supabase Storage) and saved external links (e.g. Google Docs, Figma). This is a PRO-only feature with a 2 GB storage cap per agency.

---

## Data Model

### `files` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agency_id` | uuid → agencies | |
| `project_id` | uuid → projects, nullable | null = agency-wide file |
| `type` | enum `'upload' \| 'link'` | |
| `name` | text | display name |
| `storage_path` | text, nullable | Supabase Storage path, uploads only |
| `url` | text, nullable | external URL for links only; **null for uploads** (signed URL generated at read time from `storage_path`) |
| `size` | bigint, nullable | bytes; null for links |
| `mime_type` | text, nullable | uploads only |
| `uploaded_by` | uuid → profiles, SET NULL on delete | intentionally named `uploaded_by` (not `created_by`) for semantic clarity |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS: agency members can read/write files belonging to their agency.

### `task_files` join table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `task_id` | uuid → tasks | |
| `file_id` | uuid → files ON DELETE CASCADE | |
| `linked_by` | uuid → profiles | |
| `created_at` | timestamptz | |

Unique constraint on `(task_id, file_id)`.

**Behaviour:**
- Uploading from a task creates a `files` row + a `task_files` row.
- Linking an existing file to a task creates only a `task_files` row.
- Unlinking removes the `task_files` row only (file is preserved).
- Deleting a file removes the `files` row and cascades to `task_files`.

---

## Billing

### Plan config (`lib/config/plans.ts`)

```ts
FREE:  { files_enabled: false, max_storage_bytes: 0 }
PRO:   { files_enabled: true,  max_storage_bytes: 2 * 1024 * 1024 * 1024 } // 2 GB
```

### New limit checks (`lib/billing/checkLimit.ts`)

Both functions call through the existing `getAgencyPlan()` helper, which already handles the `demo_ends_at` trial-period override (trial agencies get PRO treatment).

- **`checkFilesEnabled(agencyId)`** — returns `{ allowed: false }` on FREE. Gates all file/upload actions and the Files tab UI.
- **`checkStorageLimit(agencyId, fileSizeBytes)`** — sums `size` from all `files` rows for the agency and verifies `current + fileSizeBytes <= max_storage_bytes`. External links do not count. Called before every upload. This is a **soft limit**: concurrent uploads may slightly exceed the cap (no DB-level lock). Slight overages are acceptable at this scale.

---

## Storage

**Bucket:** `agency-files` (private)

**Path convention:**
- Project files: `{agency_id}/{project_id}/{file_id}`
- Agency-wide files: `{agency_id}/workspace/{file_id}`

Files are **not** publicly accessible. Downloads use short-lived signed URLs generated via `getSignedUrl(storagePath)`.

---

## UI

### Workspace Files tab

- New sidebar nav item, PRO-gated (shows upgrade prompt for FREE).
- Lists agency-wide files (`project_id IS NULL`).
- Columns: name (with type icon), size, uploaded by, date, linked tasks (clickable badges).
- Actions: "Uploader un fichier" button, "Ajouter un lien" button.

### Project Files tab

- New tab in the project layout alongside "Vue d'ensemble", "Board Kanban", "Versions", "Contenus attendus", "Paramètres" (inserted before "Paramètres").
- Same layout as Workspace Files, scoped to `project_id`.
- Each file shows which tasks it is linked to (clickable badges navigating to the task).

### Task attachments panel

- New "Fichiers" section inside the task detail/drawer.
- Lists files linked via `task_files`.
- Each row: type icon, name, size (or "Lien externe"), unlink button (×).
- **"Ajouter un fichier"** → modal with two tabs:
  - **Uploader** — file picker, uploads to project Files and links to task.
  - **Lier existant** — searchable list of project files, select to link.
- **"Ajouter un lien"** → inline form: URL + display name.

---

## Server Actions (`actions/files.server.ts`)

| Function | Description |
|----------|-------------|
| `getAgencyFiles(agencyId)` | Returns agency-wide files (`project_id IS NULL`) |
| `getProjectFiles(projectId)` | Returns files for a project |
| `getTaskFiles(taskId)` | Returns files linked to a task via `task_files` |
| `uploadFile(formData: FormData)` | Extracts `agencyId`, `projectId`, and file from `FormData` (required for Next.js Server Action binary transfer). Checks `checkFilesEnabled` + `checkStorageLimit`, uploads to Supabase Storage, inserts `files` row |
| `addLink(agencyId, projectId \| null, name, url)` | Checks `checkFilesEnabled`, inserts `type: 'link'` row (no storage consumed) |
| `linkFileToTask(taskId, fileId)` | Inserts into `task_files`. Cross-agency linking is prevented by RLS on `files` (caller can only read files from their own agency) |
| `unlinkFileFromTask(taskId, fileId)` | Deletes from `task_files` |
| `deleteFile(fileId)` | Fetches the file to verify caller's `agency_id` matches (explicit ownership check before storage deletion, since storage operations may use service-role client). Removes from Supabase Storage (if upload) + deletes `files` row (cascades `task_files`) |
| `getSignedUrl(storagePath)` | Generates short-lived signed URL for download. Called lazily on demand (e.g. when user clicks a file name), not embedded in list responses |

---

## Out of Scope

- Folder/hierarchy structure (can be added later if needed)
- File previews in-app (browser handles download/open natively)
- Per-file permissions beyond agency membership
- Storage quota increases beyond 2 GB (handled case-by-case)
