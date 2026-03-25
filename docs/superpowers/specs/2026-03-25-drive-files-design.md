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
| `linked_by` | uuid → profiles, SET NULL on delete | |
| `created_at` | timestamptz | |

Unique constraint on `(task_id, file_id)`.

**Behaviour:**
- Uploading from a task creates a `files` row + a `task_files` row atomically.
- Adding a link from a task creates a `files` row + a `task_files` row atomically.
- Linking an existing file to a task creates only a `task_files` row.
- Agency-wide files (`project_id IS NULL`) cannot be linked to tasks — the "Lier existant" modal only shows files belonging to the same project.
- Unlinking removes the `task_files` row only (file is preserved).
- Deleting a file removes the `files` row and cascades to `task_files`.

---

## Billing

### Plan config (`lib/config/plans.ts`)

Two new keys added to each plan object — all existing keys (`max_projects`, `max_members`, `max_tracking_links_per_month`, `ai_enabled`, `quotes_enabled`, `price_id`) are preserved unchanged:

```ts
FREE:  { ...existing, files_enabled: false, max_storage_bytes: 0 }
PRO:   { ...existing, files_enabled: true,  max_storage_bytes: 2 * 1024 * 1024 * 1024 } // 2 GB
```

### New limit checks (`lib/billing/checkLimit.ts`)

Both functions call through the existing `getAgencyPlan()` helper, which already handles the `demo_ends_at` trial-period override (trial agencies get PRO treatment).

- **`checkFilesEnabled(agencyId)`** — returns `{ allowed: false }` on FREE. Gates all file/upload actions and the Files tab UI.
- **`checkStorageLimit(agencyId, fileSizeBytes)`** — sums `size` from all `files` rows where `type = 'upload'` for the agency (`SUM` naturally skips nulls, but the `type = 'upload'` filter makes the intent explicit). Verifies `current + fileSizeBytes <= max_storage_bytes`. Called before every upload. This is a **soft limit**: concurrent uploads may slightly exceed the cap (no DB-level lock). Slight overages are acceptable at this scale.

---

## Storage

**Bucket:** `agency-files` (private)

**Path convention:**
- Project files: `{agency_id}/{project_id}/{file_id}`
- Agency-wide files: `{agency_id}/workspace/{file_id}`

Files are **not** publicly accessible. Downloads use short-lived signed URLs (TTL: **1 hour**) generated via `getSignedUrl(storagePath)`. URLs are fetched lazily on demand (e.g. when a user clicks to download), not embedded in list responses.

Storage deletions (in `deleteFile`) use the `supabaseAdmin` service-role client, consistent with how `account.server.ts` handles `agency-branding` bucket deletions.

---

## UI

### Workspace Files tab

- New entry in `mainNav` in `app-sidebar.tsx`, inserted after "Projets". PRO-gated: shows upgrade prompt for FREE agencies.
- Route: `/app/files`
- Lists agency-wide files (`project_id IS NULL`).
- Columns: name (with type icon), size, uploaded by, date, linked tasks (clickable badges).
- Actions: "Uploader un fichier" button, "Ajouter un lien" button.

### Project Files tab

- New tab in `ProjectHeader` inserted before "Paramètres". Appears in the tab list: "Vue d'ensemble" → "Board Kanban" → "Versions" → "Contenus attendus" → **"Fichiers"** → "Paramètres".
- Route: `/app/projects/[slug]/files`
- Same layout as Workspace Files, scoped to `project_id`.
- Each file shows which tasks it is linked to (clickable badges navigating to the task).

### Task attachments panel

- New "Fichiers" section inside the task detail/drawer.
- Lists files linked via `task_files`.
- Each row: type icon, name, size (or "Lien externe"), unlink button (×).
- **"Ajouter un fichier"** → modal with two tabs:
  - **Uploader** — file picker; on submit calls `uploadFile` (creates `files` row + `task_files` row).
  - **Lier existant** — searchable list of project-scoped files (same `project_id`); on select calls `linkFileToTask`.
- **"Ajouter un lien"** → inline form: URL + display name; on submit calls `addLink` with `taskId` (creates `files` row + `task_files` row atomically).

---

## Server Actions (`actions/files.server.ts`)

`agencyId` is always resolved server-side from the authenticated session — never read from client-supplied input.

| Function | Description |
|----------|-------------|
| `getAgencyFiles(agencyId)` | Returns agency-wide files (`project_id IS NULL`) |
| `getProjectFiles(projectId)` | Returns files for a project, including linked task info |
| `getTaskFiles(taskId)` | Returns files linked to a task via `task_files` |
| `uploadFile(formData: FormData)` | Extracts `projectId` and file from `FormData`; resolves `agencyId` from session. Checks `checkFilesEnabled` + `checkStorageLimit`, uploads to Supabase Storage, inserts `files` row. If `taskId` is present in `FormData`, also inserts `task_files` row |
| `addLink(projectId \| null, name, url, taskId?)` | Resolves `agencyId` from session. Checks `checkFilesEnabled`, inserts `type: 'link'` row. If `taskId` is provided, also inserts `task_files` row atomically (no storage consumed) |
| `linkFileToTask(taskId, fileId)` | Inserts into `task_files`. Cross-agency linking prevented by RLS on `files` |
| `unlinkFileFromTask(taskId, fileId)` | Deletes from `task_files` |
| `deleteFile(fileId)` | Resolves caller's `agency_id` from session and verifies it matches the file's `agency_id`. Removes from Supabase Storage via `supabaseAdmin` (if upload) + deletes `files` row (cascades `task_files`) |
| `getSignedUrl(storagePath)` | Generates 1-hour signed URL for download |

---

## Out of Scope

- Folder/hierarchy structure (can be added later if needed)
- File previews in-app (browser handles download/open natively)
- Per-file permissions beyond agency membership
- Storage quota increases beyond 2 GB (handled case-by-case)
