# Drive / Files Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file management system to Wiply allowing agencies to upload files and save external links at the workspace and project level, and attach them to individual tasks.

**Architecture:** Files are first-class DB objects in a `files` table (Supabase Storage for uploads, URL-only for links). A `task_files` join table links files to tasks. Server Actions in `actions/files.server.ts` handle all mutations. Three UI surfaces: workspace-level `/app/files` page, project-level `/app/projects/[slug]/files` tab, and a `TaskFiles` panel inside the task slide-over. PRO-only with a 2 GB soft storage cap enforced via new billing check functions.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + Storage), `supabaseAdmin` for storage ops, Zod for validation, Tailwind + shadcn/ui, Lucide icons, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-03-25-drive-files-design.md`

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/20260325000000_add_files.sql` |
| Modify | `lib/config/plans.ts` |
| Modify | `lib/billing/checkLimit.ts` |
| Create | `__tests__/unit/billing/checkFiles.test.ts` |
| Create | `actions/files.server.ts` |
| Create | `app/app/files/page.tsx` |
| Create | `components/files/FilesTable.tsx` |
| Create | `components/files/UploadFileDialog.tsx` |
| Create | `components/files/AddLinkDialog.tsx` |
| Modify | `components/app-sidebar.tsx` |
| Create | `app/app/projects/[slug]/files/page.tsx` |
| Modify | `components/projects/ProjectHeader.tsx` |
| Create | `components/projects/TaskFiles.tsx` |
| Modify | `components/projects/TaskSlideOver.tsx` |
| Modify | `actions/account.server.ts` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260325000000_add_files.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260325000000_add_files.sql

-- ─── files ──────────────────────────────────────────────────────────────────

create type file_type as enum ('upload', 'link');

create table files (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies(id) on delete cascade,
  project_id    uuid references projects(id) on delete cascade,
  type          file_type not null,
  name          text not null,
  storage_path  text,
  url           text,
  size          bigint,
  mime_type     text,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- uploads must have storage_path; links must have url; never both
alter table files add constraint files_upload_has_path
  check (type != 'upload' or storage_path is not null);
alter table files add constraint files_link_has_url
  check (type != 'link' or url is not null);
alter table files add constraint files_upload_no_url
  check (type != 'upload' or url is null);

-- RLS: read/write scoped to agency_id only
alter table files enable row level security;

create policy "agency members can read their files"
  on files for select
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can insert files"
  on files for insert
  with check (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can update their files"
  on files for update
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

create policy "agency members can delete their files"
  on files for delete
  using (
    agency_id in (
      select agency_id from profiles where id = auth.uid()
    )
  );

-- ─── task_files ──────────────────────────────────────────────────────────────

create table task_files (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  file_id    uuid not null references files(id) on delete cascade,
  linked_by  uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id, file_id)
);

-- RLS: scoped to agency via tasks.agency_id
alter table task_files enable row level security;

create policy "agency members can read task_files"
  on task_files for select
  using (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

create policy "agency members can insert task_files"
  on task_files for insert
  with check (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );

create policy "agency members can delete task_files"
  on task_files for delete
  using (
    task_id in (
      select id from tasks where agency_id in (
        select agency_id from profiles where id = auth.uid()
      )
    )
  );
```

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push
```

Expected: migration applies without errors. Verify tables exist:
```bash
npx supabase db diff --linked
```

- [ ] **Step 3: Create the `agency-files` Storage bucket**

In the Supabase dashboard (or via CLI):
```bash
npx supabase storage create agency-files --no-public
```

The bucket must be **private** (no public access). Verify it appears in the dashboard under Storage.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260325000000_add_files.sql
git commit -m "feat: add files and task_files tables with RLS"
```

---

## Task 2: Billing — Plan Config + Limit Checks + Tests

**Files:**
- Modify: `lib/config/plans.ts`
- Modify: `lib/billing/checkLimit.ts`
- Create: `__tests__/unit/billing/checkFiles.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/unit/billing/checkFiles.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkFilesEnabled, checkStorageLimit } from "@/lib/billing/checkLimit";

// Mock both clients
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function makeMockSupabase(tableData: Record<string, { data?: any; count?: number }>) {
  return {
    from: vi.fn((table: string) => {
      const entry = tableData[table] ?? { data: null, count: 0 };
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: entry.data, error: null })),
      };
      const countPromise = Promise.resolve({ data: entry.data, error: null, count: entry.count ?? 0 });
      chain.then = countPromise.then.bind(countPromise);
      chain.catch = countPromise.catch.bind(countPromise);
      chain.finally = countPromise.finally.bind(countPromise);
      return chain;
    }),
  };
}

function makeMockAdminForStorage(usedBytes: number) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
  };
  // Returns rows with `size` field, matching what checkStorageLimit sums via .reduce()
  const result = Promise.resolve({ data: usedBytes > 0 ? [{ size: usedBytes }] : [], error: null });
  chain.then = result.then.bind(result);
  chain.catch = result.catch.bind(result);
  chain.finally = result.finally.bind(result);
  return { from: vi.fn(() => chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkFilesEnabled ──────────────────────────────────────────────────────

describe("checkFilesEnabled", () => {
  it("FREE — files désactivés", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "FREE" } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("PRO");
  });

  it("PRO — files activés", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("demo_ends_at dans le futur → traité comme PRO", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "FREE", demo_ends_at: future } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("plan manquant → traité comme FREE", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: null } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(false);
  });
});

// ─── checkStorageLimit ──────────────────────────────────────────────────────

const TWO_GB = 2 * 1024 * 1024 * 1024;

describe("checkStorageLimit", () => {
  it("autorise si sous la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(100_000).from;
    const result = await checkStorageLimit("agency-1", 1_000_000);
    expect(result.allowed).toBe(true);
  });

  it("bloque si l'ajout dépasse la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    // 1.9 GB used + 200 MB file = over 2 GB
    const usedBytes = Math.floor(TWO_GB * 0.95);
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(usedBytes).from;
    const result = await checkStorageLimit("agency-1", 200 * 1024 * 1024);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("autorise si exactement à la limite (equal = still allowed)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    // 0 used + exactly 2 GB file = at the limit → allowed
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(0).from;
    const result = await checkStorageLimit("agency-1", TWO_GB);
    expect(result.allowed).toBe(true);
  });

  it("bloque si 1 byte au-dessus de la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(1).from;
    const result = await checkStorageLimit("agency-1", TWO_GB);
    expect(result.allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- --run __tests__/unit/billing/checkFiles.test.ts
```

Expected: FAIL — `checkFilesEnabled` and `checkStorageLimit` are not exported from `checkLimit.ts`.

- [ ] **Step 3: Update `lib/config/plans.ts`**

```typescript
export const PLANS = {
    FREE: {
        max_projects: 2,
        max_members: 1,
        max_tracking_links_per_month: 10,
        ai_enabled: false,
        quotes_enabled: false,
        files_enabled: false,
        max_storage_bytes: 0,
        price_id: null as null,
    },
    PRO: {
        max_projects: Infinity,
        max_members: 6,
        max_tracking_links_per_month: Infinity,
        ai_enabled: true,
        quotes_enabled: true,
        files_enabled: true,
        max_storage_bytes: 2 * 1024 * 1024 * 1024, // 2 GB
        price_id: process.env.STRIPE_PRO_PRICE_ID!,
    },
} as const

export type PlanId = keyof typeof PLANS
```

- [ ] **Step 4: Add `checkFilesEnabled` and `checkStorageLimit` to `lib/billing/checkLimit.ts`**

Append to the end of the file:

```typescript
export async function checkFilesEnabled(
    agencyId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getAgencyPlan(agencyId)

    if (!PLANS[plan].files_enabled) {
        return {
            allowed: false,
            reason: 'Les fichiers sont disponibles uniquement sur le plan PRO.',
        }
    }

    return { allowed: true }
}

export async function checkStorageLimit(
    agencyId: string,
    fileSizeBytes: number
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getAgencyPlan(agencyId)
    const limit = PLANS[plan].max_storage_bytes

    // Calculate current usage using service-role client (authoritative, bypasses RLS)
    const { data } = await supabaseAdmin
        .from('files')
        .select('size')
        .eq('agency_id', agencyId)
        .eq('type', 'upload')

    const usedBytes = (data ?? []).reduce((sum: number, row: { size: number | null }) => sum + (row.size ?? 0), 0)

    if (usedBytes + fileSizeBytes > limit) {
        const usedMB = Math.round(usedBytes / (1024 * 1024))
        const limitGB = Math.round(limit / (1024 * 1024 * 1024))
        return {
            allowed: false,
            reason: `Limite de stockage atteinte (${usedMB} Mo utilisés sur ${limitGB} Go). Libérez de l'espace ou contactez le support.`,
        }
    }

    return { allowed: true }
}
```

Also add `supabaseAdmin` import at the top of `checkLimit.ts` (after the existing imports):

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --run __tests__/unit/billing/checkFiles.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
npm run test:run
```

Expected: 169 + 8 = 177 tests passing.

- [ ] **Step 7: Commit**

```bash
git add lib/config/plans.ts lib/billing/checkLimit.ts __tests__/unit/billing/checkFiles.test.ts
git commit -m "feat: add files billing config and checkFilesEnabled/checkStorageLimit"
```

---

## Task 3: Server Actions

**Files:**
- Create: `actions/files.server.ts`

- [ ] **Step 1: Create `actions/files.server.ts`**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkFilesEnabled, checkStorageLimit } from "@/lib/billing/checkLimit";
import { z } from "zod";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Non authentifié");

    const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

    if (!profile?.agency_id) throw new Error("Agence introuvable");
    return { supabase, userId: user.id, agencyId: profile.agency_id as string };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type FileRecord = {
    id: string;
    agency_id: string;
    project_id: string | null;
    type: "upload" | "link";
    name: string;
    storage_path: string | null;
    url: string | null;
    size: number | null;
    mime_type: string | null;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
    uploader: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
    task_files?: { task_id: string; task: { task_number: number; title: string; project: { slug: string; task_prefix: string } } }[];
};

// ─── Read actions ────────────────────────────────────────────────────────────

export async function getAgencyFiles(): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();
        const { data, error } = await supabase
            .from("files")
            .select(`
                *,
                uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email),
                task_files(task_id, task:tasks!task_files_task_id_fkey(task_number, title, project:projects!tasks_project_id_fkey(slug, task_prefix)))
            `)
            .eq("agency_id", agencyId)
            .is("project_id", null)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getProjectFiles(projectId: string): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase } = await getAuthContext();
        const { data, error } = await supabase
            .from("files")
            .select(`
                *,
                uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email),
                task_files(task_id, task:tasks!task_files_task_id_fkey(task_number, title, project:projects!tasks_project_id_fkey(slug, task_prefix)))
            `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data: (data ?? []) as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getTaskFiles(taskId: string): Promise<{ success: boolean; data?: FileRecord[]; error?: string }> {
    try {
        const { supabase } = await getAuthContext();
        const { data, error } = await supabase
            .from("task_files")
            .select(`
                file:files!task_files_file_id_fkey(
                    *,
                    uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)
                )
            `)
            .eq("task_id", taskId);

        if (error) throw error;
        const files = (data ?? []).map((row: any) => row.file).filter(Boolean);
        return { success: true, data: files as FileRecord[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData): Promise<{ success: boolean; data?: FileRecord; error?: string }> {
    try {
        const { supabase, userId, agencyId } = await getAuthContext();

        const file = formData.get("file") as File | null;
        const projectId = formData.get("projectId") as string | null || null;
        const taskId = formData.get("taskId") as string | null || null;

        if (!file) return { success: false, error: "Aucun fichier fourni" };

        const filesCheck = await checkFilesEnabled(agencyId);
        if (!filesCheck.allowed) return { success: false, error: filesCheck.reason };

        const storageCheck = await checkStorageLimit(agencyId, file.size);
        if (!storageCheck.allowed) return { success: false, error: storageCheck.reason };

        // Generate a stable file ID for the storage path
        const fileId = crypto.randomUUID();
        const storagePath = projectId
            ? `${agencyId}/${projectId}/${fileId}`
            : `${agencyId}/workspace/${fileId}`;

        const bytes = await file.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
            .from("agency-files")
            .upload(storagePath, bytes, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: fileRow, error: insertError } = await supabase
            .from("files")
            .insert({
                id: fileId,
                agency_id: agencyId,
                project_id: projectId,
                type: "upload",
                name: file.name,
                storage_path: storagePath,
                url: null,
                size: file.size,
                mime_type: file.type || null,
                uploaded_by: userId,
            })
            .select(`*, uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)`)
            .single();

        if (insertError) {
            // Rollback storage upload
            await supabaseAdmin.storage.from("agency-files").remove([storagePath]);
            throw insertError;
        }

        if (taskId) {
            await supabase.from("task_files").insert({ task_id: taskId, file_id: fileId, linked_by: userId });
        }

        return { success: true, data: fileRow as FileRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Add external link ───────────────────────────────────────────────────────

const AddLinkSchema = z.object({
    projectId: z.string().uuid().nullable(),
    name: z.string().min(1).max(255),
    url: z.string().url(),
    taskId: z.string().uuid().optional(),
});

export async function addLink(
    projectId: string | null,
    name: string,
    url: string,
    taskId?: string
): Promise<{ success: boolean; data?: FileRecord; error?: string }> {
    try {
        const parsed = AddLinkSchema.safeParse({ projectId, name, url, taskId });
        if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

        // Agency-wide links cannot be linked to tasks
        if (projectId === null && taskId) {
            return { success: false, error: "Les fichiers globaux ne peuvent pas être liés à un ticket" };
        }

        const { supabase, userId, agencyId } = await getAuthContext();

        const filesCheck = await checkFilesEnabled(agencyId);
        if (!filesCheck.allowed) return { success: false, error: filesCheck.reason };

        const { data: fileRow, error } = await supabase
            .from("files")
            .insert({
                agency_id: agencyId,
                project_id: projectId,
                type: "link",
                name,
                url,
                storage_path: null,
                size: null,
                mime_type: null,
                uploaded_by: userId,
            })
            .select(`*, uploader:profiles!files_uploaded_by_fkey(id, first_name, last_name, email)`)
            .single();

        if (error) throw error;

        if (taskId) {
            await supabase.from("task_files").insert({ task_id: taskId, file_id: fileRow.id, linked_by: userId });
        }

        return { success: true, data: fileRow as FileRecord };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Link / Unlink ───────────────────────────────────────────────────────────

export async function linkFileToTask(taskId: string, fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, userId, agencyId } = await getAuthContext();

        // Verify the file belongs to this agency
        const { data: file } = await supabase.from("files").select("agency_id, project_id").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };

        // Verify file is project-scoped and matches task's project
        if (!file.project_id) return { success: false, error: "Les fichiers globaux ne peuvent pas être liés à un ticket" };

        const { data: task } = await supabase.from("tasks").select("project_id").eq("id", taskId).single();
        if (!task || task.project_id !== file.project_id) {
            return { success: false, error: "Ce fichier n'appartient pas au même projet que ce ticket" };
        }

        const { error } = await supabase.from("task_files").insert({ task_id: taskId, file_id: fileId, linked_by: userId });
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function unlinkFileFromTask(taskId: string, fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        // Verify the task belongs to this agency
        const { data: task } = await supabase.from("tasks").select("agency_id").eq("id", taskId).single();
        if (!task || task.agency_id !== agencyId) return { success: false, error: "Ticket introuvable" };

        const { error } = await supabase.from("task_files").delete().eq("task_id", taskId).eq("file_id", fileId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        const { data: file } = await supabase.from("files").select("agency_id, type, storage_path").eq("id", fileId).single();
        if (!file || file.agency_id !== agencyId) return { success: false, error: "Fichier introuvable" };

        // Delete storage object first (if upload)
        if (file.type === "upload" && file.storage_path) {
            const { error: storageError } = await supabaseAdmin.storage
                .from("agency-files")
                .remove([file.storage_path]);
            if (storageError) throw storageError;
        }

        const { error } = await supabase.from("files").delete().eq("id", fileId);
        if (error) throw error;

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Signed URL ──────────────────────────────────────────────────────────────

export async function getSignedUrl(storagePath: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { supabase, agencyId } = await getAuthContext();

        const { data: file } = await supabase
            .from("files")
            .select("agency_id, type")
            .eq("storage_path", storagePath)
            .eq("agency_id", agencyId)
            .single();

        if (!file) return { success: false, error: "Fichier introuvable" };
        if (file.type === "link") return { success: false, error: "Ce fichier n'a pas de chemin de stockage" };

        const { data, error } = await supabaseAdmin.storage
            .from("agency-files")
            .createSignedUrl(storagePath, 3600); // 1 hour

        if (error) throw error;
        return { success: true, url: data.signedUrl };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/files.server.ts
git commit -m "feat: add files server actions"
```

---

## Task 4: Workspace Files Page + Sidebar Nav

**Files:**
- Create: `app/app/files/page.tsx`
- Create: `components/files/FilesTable.tsx`
- Create: `components/files/UploadFileDialog.tsx`
- Create: `components/files/AddLinkDialog.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Add "Fichiers" to the sidebar `mainNav`**

In `components/app-sidebar.tsx`, find the `mainNav` array (line ~28) and add the entry after "Projets":

```typescript
import { Briefcase, Building2, ChevronsUpDown, FileText, Kanban, LayoutDashboard,
    LogOut, Settings, ShieldCheck, Users, PanelLeftClose, PanelLeftOpen, Layers, FolderOpen } from "lucide-react"
```

```typescript
const mainNav = [
    { label: "Tableau de bord", href: "/app", icon: LayoutDashboard },
    { label: "Opportunités", href: "/app/opportunities", icon: Briefcase },
    { label: "Devis", href: "/app/quotes", icon: FileText, proOnly: true },
    { label: "Projets", href: "/app/projects", icon: Kanban },
    { label: "Fichiers", href: "/app/files", icon: FolderOpen, proOnly: true },
]
```

- [ ] **Step 2: Create `components/files/AddLinkDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addLink } from "@/actions/files.server";
import type { FileRecord } from "@/actions/files.server";

interface AddLinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | null;
    taskId?: string;
    onAdded: (file: FileRecord) => void;
}

export function AddLinkDialog({ open, onOpenChange, projectId, taskId, onAdded }: AddLinkDialogProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;
        setIsLoading(true);
        const result = await addLink(projectId, name.trim(), url.trim(), taskId);
        setIsLoading(false);
        if (result.success && result.data) {
            toast.success("Lien ajouté");
            onAdded(result.data);
            setName(""); setUrl("");
            onOpenChange(false);
        } else {
            toast.error(result.error ?? "Erreur lors de l'ajout du lien");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter un lien externe</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="link-name">Nom</Label>
                        <Input id="link-name" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Maquettes Figma, Google Doc…" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input id="link-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://…" required />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Ajout…" : "Ajouter"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Create `components/files/UploadFileDialog.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadFile } from "@/actions/files.server";
import type { FileRecord } from "@/actions/files.server";

interface UploadFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string | null;
    taskId?: string;
    onUploaded: (file: FileRecord) => void;
}

export function UploadFileDialog({ open, onOpenChange, projectId, taskId, onUploaded }: UploadFileDialogProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (projectId) formData.append("projectId", projectId);
        if (taskId) formData.append("taskId", taskId);
        const result = await uploadFile(formData);
        setIsLoading(false);
        if (result.success && result.data) {
            toast.success("Fichier uploadé");
            onUploaded(result.data);
            setSelectedFile(null);
            onOpenChange(false);
        } else {
            toast.error(result.error ?? "Erreur lors de l'upload");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Uploader un fichier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input ref={inputRef} type="file" className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                    <div
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        {selectedFile ? (
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={!selectedFile || isLoading}>
                            {isLoading ? "Upload…" : "Uploader"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 4: Create `components/files/FilesTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Link2, FileUp, Trash2, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteFile, getSignedUrl } from "@/actions/files.server";
import { UploadFileDialog } from "./UploadFileDialog";
import { AddLinkDialog } from "./AddLinkDialog";
import type { FileRecord } from "@/actions/files.server";
import { formatBytes } from "@/lib/utils";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("fr");

interface FilesTableProps {
    initialFiles: FileRecord[];
    projectId: string | null; // null = workspace-level
}

export function FilesTable({ initialFiles, projectId }: FilesTableProps) {
    const [files, setFiles] = useState<FileRecord[]>(initialFiles);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDownload = async (file: FileRecord) => {
        if (file.type === "link" && file.url) {
            window.open(file.url, "_blank");
            return;
        }
        if (file.storage_path) {
            const result = await getSignedUrl(file.storage_path);
            if (result.success && result.url) {
                window.open(result.url, "_blank");
            } else {
                toast.error("Impossible de générer le lien de téléchargement");
            }
        }
    };

    const handleDelete = async (fileId: string) => {
        setDeletingId(fileId);
        const result = await deleteFile(fileId);
        setDeletingId(null);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.success("Fichier supprimé");
        } else {
            toast.error(result.error ?? "Erreur lors de la suppression");
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{files.length} fichier{files.length !== 1 ? "s" : ""}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                        <Link2 className="w-4 h-4 mr-2" /> Ajouter un lien
                    </Button>
                    <Button size="sm" onClick={() => setUploadOpen(true)}>
                        <FileUp className="w-4 h-4 mr-2" /> Uploader un fichier
                    </Button>
                </div>
            </div>

            {/* Table */}
            {files.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                    Aucun fichier pour l'instant. Uploadez un fichier ou ajoutez un lien.
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Taille</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ajouté par</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tickets liés</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {files.map((file) => (
                                <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {file.type === "link"
                                                ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                                : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                            }
                                            <button
                                                className="font-medium hover:underline text-left truncate max-w-[280px]"
                                                onClick={() => handleDownload(file)}
                                            >
                                                {file.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {file.size ? formatBytes(file.size) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {file.uploader
                                            ? `${file.uploader.first_name ?? ""} ${file.uploader.last_name ?? ""}`.trim() || file.uploader.email
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                        {dayjs(file.created_at).fromNow()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(file.task_files ?? []).map((tf: any) => (
                                                <a
                                                    key={tf.task_id}
                                                    href={`/app/projects/${tf.task.project.slug}/board`}
                                                    className="inline-block"
                                                >
                                                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-muted">
                                                        {tf.task.project.task_prefix}-{tf.task.task_number}
                                                    </Badge>
                                                </a>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            {file.type === "link" ? (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                    <a href={file.url!} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)}>
                                                    <Download className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(file.id)}
                                                disabled={deletingId === file.id}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <UploadFileDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                projectId={projectId}
                onUploaded={(file) => setFiles((prev) => [file, ...prev])}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={projectId}
                onAdded={(file) => setFiles((prev) => [file, ...prev])}
            />
        </div>
    );
}
```

Note: `formatBytes` needs to be added to `lib/utils.ts` if it doesn't exist. Check first:
```bash
grep -n "formatBytes" /Users/alexhm/dev/la-partie-commune/lib/utils.ts
```
If missing, add to `lib/utils.ts`:
```typescript
export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return "0 o";
    const k = 1024;
    const sizes = ["o", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
```

- [ ] **Step 5: Create `app/app/files/page.tsx`**

```tsx
import { getAgencyFiles } from "@/actions/files.server";
import { FilesTable } from "@/components/files/FilesTable";
import { getAuthenticatedUserContext } from "@/actions/auth.server";
import { isProPlan } from "@/lib/validators/agency";
import { redirect } from "next/navigation";

export default async function FilesPage() {
    const ctx = await getAuthenticatedUserContext();
    if (!isProPlan(ctx.agency)) redirect("/app");

    const result = await getAgencyFiles();
    const files = result.success ? (result.data ?? []) : [];

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Fichiers</h1>
                <p className="text-muted-foreground mt-1">Fichiers et liens de l'espace de travail</p>
            </div>
            <FilesTable initialFiles={files} projectId={null} />
        </div>
    );
}
```

Note: `getAuthenticatedUserContext` is the same helper used by `app/app/layout.tsx`. Check the import path in that file to confirm it.

- [ ] **Step 6: Verify the workspace Files page renders**

Start the dev server (`npm run dev`) and navigate to `/app/files`. Confirm:
- PRO agencies see the FilesTable
- FREE agencies are redirected to `/app`
- The "Fichiers" item appears in the sidebar

- [ ] **Step 7: Commit**

```bash
git add components/app-sidebar.tsx app/app/files/page.tsx components/files/
git commit -m "feat: add workspace Files page and sidebar nav item"
```

---

## Task 5: Project Files Tab

**Files:**
- Create: `app/app/projects/[slug]/files/page.tsx`
- Modify: `components/projects/ProjectHeader.tsx`

- [ ] **Step 1: Add "Fichiers" tab to `ProjectHeader`**

In `components/projects/ProjectHeader.tsx`, find the `allTabs` array (around line 13) and add the Fichiers tab before "Paramètres". Also add the `FolderOpen` import:

```typescript
import { Figma, Github, Globe, Layout, KanbanSquare, Settings, ArrowLeft, ListChecks, Tag, FolderOpen } from "lucide-react";
```

```typescript
const allTabs = [
    { name: "Vue d'ensemble", path: baseUrl, icon: Layout },
    { name: "Board Kanban", path: `${baseUrl}/board`, icon: KanbanSquare },
    { name: "Versions", path: `${baseUrl}/versions`, icon: Tag },
    ...(!project.is_internal ? [{ name: "Contenus attendus", path: `${baseUrl}/checklist`, icon: ListChecks }] : []),
    { name: "Fichiers", path: `${baseUrl}/files`, icon: FolderOpen },
    { name: "Paramètres", path: `${baseUrl}/settings`, icon: Settings },
];
```

- [ ] **Step 2: Create `app/app/projects/[slug]/files/page.tsx`**

```tsx
import { getProjectBySlug } from "@/actions/project.server";
import { getProjectFiles } from "@/actions/files.server";
import { FilesTable } from "@/components/files/FilesTable";
import { notFound } from "next/navigation";

export default async function ProjectFilesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const projectResult = await getProjectBySlug(slug);
    if (!projectResult.success || !projectResult.data) notFound();

    const project = projectResult.data;
    const filesResult = await getProjectFiles(project.id);
    const files = filesResult.success ? (filesResult.data ?? []) : [];

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <FilesTable initialFiles={files} projectId={project.id} />
        </div>
    );
}
```

- [ ] **Step 3: Verify the project Files tab renders**

Navigate to any project in dev and click the "Fichiers" tab. Confirm:
- Tab appears in the project header nav
- FilesTable renders (empty or with data)

- [ ] **Step 4: Commit**

```bash
git add components/projects/ProjectHeader.tsx app/app/projects/[slug]/files/page.tsx
git commit -m "feat: add project Files tab"
```

---

## Task 6: Task Attachments Panel

**Files:**
- Create: `components/projects/TaskFiles.tsx`
- Modify: `components/projects/TaskSlideOver.tsx`

- [ ] **Step 1: Create `components/projects/TaskFiles.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Link2, FileUp, X, Loader2, Plus, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    getTaskFiles, getProjectFiles, linkFileToTask, unlinkFileFromTask, getSignedUrl,
    type FileRecord,
} from "@/actions/files.server";
import { UploadFileDialog } from "@/components/files/UploadFileDialog";
import { AddLinkDialog } from "@/components/files/AddLinkDialog";
import { formatBytes } from "@/lib/utils";

interface TaskFilesProps {
    task: any; // task with .id, .project_id
    projectId: string;
}

export function TaskFiles({ task, projectId }: TaskFilesProps) {
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [projectFiles, setProjectFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);

    useEffect(() => {
        if (!task?.id) { setFiles([]); return; }
        setIsLoading(true);
        getTaskFiles(task.id).then((r) => {
            if (r.success && r.data) setFiles(r.data);
            setIsLoading(false);
        });
    }, [task?.id]);

    const openAddModal = () => {
        // Load project files for "Lier existant" tab
        getProjectFiles(projectId).then((r) => {
            if (r.success && r.data) setProjectFiles(r.data);
        });
        setAddModalOpen(true);
    };

    const handleUnlink = async (fileId: string) => {
        if (!task?.id) return;
        setUnlinkingId(fileId);
        const result = await unlinkFileFromTask(task.id, fileId);
        setUnlinkingId(null);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
        } else {
            toast.error(result.error ?? "Erreur lors de la dissociation");
        }
    };

    const handleLinkExisting = async (fileId: string) => {
        if (!task?.id) return;
        const result = await linkFileToTask(task.id, fileId);
        if (result.success) {
            // Add the linked file to the list
            const linked = projectFiles.find((f) => f.id === fileId);
            if (linked) setFiles((prev) => [...prev, linked]);
            setAddModalOpen(false);
            toast.success("Fichier lié au ticket");
        } else {
            toast.error(result.error ?? "Erreur lors de la liaison");
        }
    };

    const handleDownload = async (file: FileRecord) => {
        if (file.type === "link" && file.url) {
            window.open(file.url, "_blank");
            return;
        }
        if (file.storage_path) {
            const result = await getSignedUrl(file.storage_path);
            if (result.success && result.url) window.open(result.url, "_blank");
            else toast.error("Impossible de générer le lien");
        }
    };

    if (!task) return null;

    const alreadyLinkedIds = new Set(files.map((f) => f.id));
    const linkableFiles = projectFiles.filter((f) => !alreadyLinkedIds.has(f.id));

    return (
        <div className="px-10 pb-8">
            <div className="border-t border-border/30 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Fichiers</h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLinkOpen(true)}>
                            <Link2 className="w-3 h-3 mr-1" /> Ajouter un lien
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openAddModal}>
                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                    </div>
                ) : files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun fichier lié à ce ticket.</p>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors group">
                                {file.type === "link"
                                    ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                    : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                }
                                <button
                                    className="flex-1 text-sm font-medium text-left truncate hover:underline"
                                    onClick={() => handleDownload(file)}
                                >
                                    {file.name}
                                </button>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {file.size ? formatBytes(file.size) : "Lien externe"}
                                </span>
                                <button
                                    onClick={() => handleUnlink(file.id)}
                                    disabled={unlinkingId === file.id}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add file modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajouter un fichier</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="upload">
                        <TabsList className="w-full">
                            <TabsTrigger value="upload" className="flex-1">Uploader</TabsTrigger>
                            <TabsTrigger value="existing" className="flex-1">Lier existant</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="pt-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                Uploadez un nouveau fichier — il sera aussi disponible dans l'onglet Fichiers du projet.
                            </p>
                            <Button className="w-full" onClick={() => { setAddModalOpen(false); setUploadOpen(true); }}>
                                <FileUp className="w-4 h-4 mr-2" /> Choisir un fichier
                            </Button>
                        </TabsContent>
                        <TabsContent value="existing" className="pt-4">
                            {linkableFiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Aucun fichier disponible dans ce projet.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {linkableFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/40 text-left transition-colors"
                                            onClick={() => handleLinkExisting(file.id)}
                                        >
                                            {file.type === "link"
                                                ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                                                : <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                            }
                                            <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                                            {file.size && <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <UploadFileDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                projectId={projectId}
                taskId={task?.id}
                onUploaded={(file) => setFiles((prev) => [...prev, file])}
            />
            <AddLinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                projectId={projectId}
                taskId={task?.id}
                onAdded={(file) => setFiles((prev) => [...prev, file])}
            />
        </div>
    );
}
```

- [ ] **Step 2: Wire `TaskFiles` into `TaskSlideOver`**

In `components/projects/TaskSlideOver.tsx`:

1. Add the import at the top (alongside other task component imports):
```typescript
import { TaskFiles } from "./TaskFiles";
```

2. In the JSX, add `<TaskFiles>` between `<TaskSubTasks>` and `<TaskComments>`:

```tsx
<TaskSubTasks
    task={task}
    taskPrefix={taskPrefix}
    subTasks={subTasks}
    doneSubCount={doneSubCount}
    newSubTitle={newSubTitle}
    isCreatingSubTask={isCreatingSubTask}
    onNewSubTitleChange={setNewSubTitle}
    onCreateSubTask={handleCreateSubTask}
    onOpenTask={onOpenTask}
/>

{task && (
    <TaskFiles task={task} projectId={projectId} />
)}

<TaskComments
    task={task}
    ...
```

- [ ] **Step 3: Verify the task panel works**

Open any existing task in the slide-over. Confirm:
- "Fichiers" section appears below sub-tasks
- "Ajouter un fichier" and "Ajouter un lien" buttons work
- Files can be unlinked with the × button

- [ ] **Step 4: Commit**

```bash
git add components/projects/TaskFiles.tsx components/projects/TaskSlideOver.tsx
git commit -m "feat: add TaskFiles panel to task slide-over"
```

---

## Task 7: Agency Deletion Cleanup

**Files:**
- Modify: `actions/account.server.ts`

- [ ] **Step 1: Locate `deleteAgencyData` in `account.server.ts`**

Find the function that deletes agency data. It deletes things like `portal_uploads`, `project_checklists`, `tasks`, etc.

- [ ] **Step 2: Add files cleanup before the tasks deletion**

Find the section that deletes tasks and insert the files cleanup before it:

```typescript
// ─── Files cleanup ──────────────────────────────────────────────────────────
// 1. Fetch storage paths BEFORE deleting rows
const { data: agencyFiles } = await supabaseAdmin
    .from("files")
    .select("id, storage_path")
    .eq("agency_id", agencyId)
    .eq("type", "upload")

// 2. Delete files rows (cascades task_files via file_id FK)
await supabaseAdmin.from("files").delete().eq("agency_id", agencyId)

// 3. Delete Storage objects after DB commit
if (agencyFiles && agencyFiles.length > 0) {
    const storagePaths = agencyFiles
        .map((f: { storage_path: string | null }) => f.storage_path)
        .filter(Boolean) as string[]
    if (storagePaths.length > 0) {
        await supabaseAdmin.storage.from("agency-files").remove(storagePaths)
    }
}
// ────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 3: Run the test suite to confirm no regressions**

```bash
npm run test:run
```

Expected: all tests still pass.

- [ ] **Step 4: Commit**

```bash
git add actions/account.server.ts
git commit -m "feat: clean up agency files on account deletion"
```

---

## Final Verification

- [ ] Run `npm run build` — confirm no TypeScript errors
- [ ] Run `npm run test:run` — confirm all tests pass
- [ ] Navigate to `/app/files` as a PRO agency — confirm file upload and link addition work
- [ ] Navigate to a project's Fichiers tab — confirm project-scoped files work
- [ ] Open a task, attach a file, verify it appears in the project Files tab with a task badge
- [ ] From the project Files tab, confirm clicking a task badge navigates to the correct task
- [ ] Commit any remaining fixes
