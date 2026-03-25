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

**RLS:** agency members can read/write files where `agency_id` matches their own agency. The policy is based solely on `agency_id` — not `uploaded_by` — so orphaned files (after a profile deletion) remain accessible and are still counted in storage aggregations. This RLS also covers `getProjectFiles`: callers can only read files from their own agency; the `projectId` parameter filters within that set.

### `task_files` join table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `task_id` | uuid → tasks | |
| `file_id` | uuid → files ON DELETE CASCADE | |
| `linked_by` | uuid → profiles, SET NULL on delete | |
| `created_at` | timestamptz | |

Unique constraint on `(task_id, file_id)`.

**RLS:** users can insert/delete `task_files` rows only when the `task_id` belongs to a task in their agency (join through `tasks.agency_id`). This is the sole RLS guard preventing cross-agency task linking.

**Behaviour:**
- Uploading from a task creates a `files` row + a `task_files` row atomically.
- Adding a link from a task creates a `files` row + a `task_files` row atomically.
- Linking an existing file to a task creates only a `task_files` row.
- Agency-wide files (`project_id IS NULL`) cannot be linked to tasks. `linkFileToTask` enforces this server-side by verifying `file.project_id IS NOT NULL` and that it matches the task's `project_id`.
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

`max_storage_bytes: 0` on FREE is never reached in practice since `checkFilesEnabled` blocks FREE agencies before `checkStorageLimit` is ever called.

### New limit checks (`lib/billing/checkLimit.ts`)

Both functions call through the existing `getAgencyPlan()` helper, which already handles the `demo_ends_at` trial-period override (trial agencies get PRO treatment). Both return `{ allowed: boolean; reason?: string }` — consistent with all other check functions.

- **`checkFilesEnabled(agencyId)`** — returns `{ allowed: false, reason: "..." }` on FREE. Gates all file/upload actions server-side.
- **`checkStorageLimit(agencyId, fileSizeBytes)`** — sums `size` from all `files` rows where `type = 'upload'` for the agency (`SUM` naturally skips nulls, but the `type = 'upload'` filter makes the intent explicit). Verifies `current + fileSizeBytes <= max_storage_bytes`. Called before every upload, always after `checkFilesEnabled`. This is a **soft limit**: concurrent uploads may slightly exceed the cap (no DB-level lock). Slight overages are acceptable at this scale.

---

## Storage

**Bucket:** `agency-files` (private)

**Path convention:**
- Project files: `{agency_id}/{project_id}/{file_id}`
- Agency-wide files: `{agency_id}/workspace/{file_id}`

Files are **not** publicly accessible. Downloads use signed URLs (TTL: **1 hour**) generated via `getSignedUrl`. Before generating a signed URL, the function looks up the `files` row by `storage_path`, verifies the row's `agency_id` matches the caller's session agency — preventing access to another agency's storage paths.

Storage deletions (in `deleteFile`) use the `supabaseAdmin` service-role client, consistent with how `account.server.ts` handles `agency-branding` bucket deletions.

**Agency deletion:** `deleteAgencyData` in `account.server.ts` must be updated to delete all `files` rows and their corresponding `agency-files` Storage objects before the agency row is deleted. Storage objects are never auto-cleaned by DB cascades — this requires explicit code.

---

## UI

### Workspace Files tab

- New entry appended as the last item in `mainNav` (after "Projets") in `app-sidebar.tsx`. Belongs in `mainNav` (primary work tool) rather than `secondaryNav` (which contains management/config items like "Agence" and "Espace interne").
- PRO-gated using `isProPlan(agency)` client-side (consistent with how "Devis" is handled today), showing an upgrade prompt for FREE agencies.
- Route: `/app/files`
- Lists agency-wide files (`project_id IS NULL`).
- Columns: name (with type icon), size, uploaded by, date, linked tasks (clickable badges).
- Actions: "Uploader un fichier" button, "Ajouter un lien" button. These call `uploadFile`/`addLink` without a `taskId` — no `task_files` row is created.

### Project Files tab

- New tab in `ProjectHeader` inserted before "Paramètres". Shown for **all** projects (both internal and external — unlike "Contenus attendus" which is hidden for internal projects).
- Resulting tab order: "Vue d'ensemble" → "Board Kanban" → "Versions" → "Contenus attendus" (external only) → **"Fichiers"** → "Paramètres".
- Route: `/app/projects/[slug]/files`
- Same layout as Workspace Files, scoped to `project_id`.
- Each file shows which tasks it is linked to (clickable badges navigating to the task).
- Actions call `uploadFile`/`addLink` without a `taskId` — no `task_files` row is created from this view.

### Task attachments panel

- New "Fichiers" section inside the task detail/drawer.
- Lists files linked via `task_files`.
- Each row: type icon, name, size (or "Lien externe"), unlink button (×).
- **"Ajouter un fichier"** → modal with two tabs:
  - **Uploader** — file picker; on submit calls `uploadFile` with `taskId` (creates `files` row + `task_files` row).
  - **Lier existant** — searchable list of project-scoped files (same `project_id`); on select calls `linkFileToTask`.
- **"Ajouter un lien"** → inline form: URL + display name; on submit calls `addLink` with `taskId` (creates `files` row + `task_files` row atomically).

---

## Server Actions (`actions/files.server.ts`)

`agencyId` is always resolved server-side from the authenticated session — never accepted as a parameter from the client.

| Function | Description |
|----------|-------------|
| `getAgencyFiles()` | Resolves `agencyId` from session. Returns agency-wide files (`project_id IS NULL`) |
| `getProjectFiles(projectId)` | Returns files for a project; authorization covered by `files` RLS (agency-scoped) |
| `getTaskFiles(taskId)` | Returns files linked to a task via `task_files` |
| `uploadFile(formData: FormData)` | Extracts `projectId` and file from `FormData`; resolves `agencyId` from session. Checks `checkFilesEnabled` + `checkStorageLimit`, uploads to Supabase Storage, inserts `files` row. If `taskId` is present in `FormData`, also inserts `task_files` row atomically |
| `addLink(projectId \| null, name, url, taskId?)` | Resolves `agencyId` from session. Checks `checkFilesEnabled`, inserts `type: 'link'` row. If `taskId` is provided, also inserts `task_files` row atomically. If called from Files tab pages, `taskId` is omitted and no `task_files` row is created |
| `linkFileToTask(taskId, fileId)` | Verifies `file.project_id IS NOT NULL` and matches the task's `project_id` (prevents linking agency-wide files to tasks). Inserts into `task_files`; cross-agency protection enforced by `task_files` RLS |
| `unlinkFileFromTask(taskId, fileId)` | Deletes from `task_files` |
| `deleteFile(fileId)` | Resolves caller's `agency_id` from session and verifies it matches the file's `agency_id`. Removes from Supabase Storage via `supabaseAdmin` (if upload) + deletes `files` row (cascades `task_files`) |
| `getSignedUrl(storagePath)` | Looks up `files` row by `storage_path`, verifies `agency_id` matches caller's session, then generates 1-hour signed URL |

---

## Out of Scope

- Folder/hierarchy structure (can be added later if needed)
- File previews in-app (browser handles download/open natively)
- Per-file permissions beyond agency membership
- Storage quota increases beyond 2 GB (handled case-by-case)
