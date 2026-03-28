# Notification Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every notification in the notification center and digest email links directly to the exact resource it refers to, using routing data stored in `metadata` at notification creation time.

**Architecture:** A pure `resolveLink(notification)` function maps notification type + metadata to a URL. Server actions are enriched to store the routing data (slug, task_number, etc.) in metadata at creation time. The digest Edge Function gets a Deno copy of the same switch logic and wraps titles in `<a>` tags when a link is available.

**Tech Stack:** Next.js App Router, Supabase JS, Deno (Edge Function), TypeScript/Vitest for tests.

---

## File Map

| File | Change |
|---|---|
| `lib/notifications/resolve-link.ts` | **Create** — pure `resolveLink(n)` function, exported for use in NotificationCenter and tests |
| `components/NotificationCenter.tsx` | **Modify** — replace ad-hoc navigation with `resolveLink` import |
| `actions/task.server.ts` | **Modify** — enrich `addTaskComment` metadata with `project_slug`, `task_number`, `task_prefix` |
| `actions/project.server.ts` | **Modify** — enrich `createTask` and `updateTaskDetails` metadata with same fields |
| `actions/opportunity.server.ts` | **Modify** — enrich `updateOpportunityStatus` metadata with `opportunity_slug` |
| `actions/portal.server.ts` | **Modify** — enrich `submitClientContent` metadata with `project_slug` |
| `app/t/[code]/route.ts` | **Modify** — extend tracking_links select to join `opportunities(slug)`, add `opportunity_slug` to metadata |
| `supabase/functions/send-digest/index.ts` | **Modify** — fix type mismatch, add `task_mention`, add `metadata` to SELECT, add Deno `resolveLink`, add link anchors to rows |
| `__tests__/unit/notifications/resolve-link.test.ts` | **Create** — unit tests for `resolveLink` |

---

## Task 1: `resolveLink` utility + NotificationCenter

**Files:**
- Create: `lib/notifications/resolve-link.ts`
- Create: `__tests__/unit/notifications/resolve-link.test.ts`
- Modify: `components/NotificationCenter.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/unit/notifications/resolve-link.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { resolveLink } from "@/lib/notifications/resolve-link"

describe("resolveLink", () => {
  it("returns null for member_joined (no metadata needed)", () => {
    expect(resolveLink({ type: "member_joined", metadata: {} })).toBe("/app/agency")
  })

  it("returns task board URL for task_comment with full metadata", () => {
    const meta = { project_slug: "my-proj", task_prefix: "MYP", task_number: 42 }
    expect(resolveLink({ type: "task_comment", metadata: meta })).toBe(
      "/app/projects/my-proj/board?task=MYP-42"
    )
  })

  it("returns task board URL for task_assigned", () => {
    const meta = { project_slug: "crm", task_prefix: "CRM", task_number: 7 }
    expect(resolveLink({ type: "task_assigned", metadata: meta })).toBe(
      "/app/projects/crm/board?task=CRM-7"
    )
  })

  it("returns task board URL for task_mention", () => {
    const meta = { project_slug: "crm", task_prefix: "CRM", task_number: 3 }
    expect(resolveLink({ type: "task_mention", metadata: meta })).toBe(
      "/app/projects/crm/board?task=CRM-3"
    )
  })

  it("returns null for task_comment when metadata is missing slug", () => {
    expect(resolveLink({ type: "task_comment", metadata: { task_id: "abc" } })).toBeNull()
  })

  it("returns opportunity URL for opportunity_status_changed", () => {
    const meta = { opportunity_slug: "my-opp" }
    expect(resolveLink({ type: "opportunity_status_changed", metadata: meta })).toBe(
      "/app/opportunities/my-opp"
    )
  })

  it("returns null for opportunity_status_changed when slug missing", () => {
    expect(resolveLink({ type: "opportunity_status_changed", metadata: {} })).toBeNull()
  })

  it("returns checklist URL for portal_submission", () => {
    const meta = { project_slug: "client-proj" }
    expect(resolveLink({ type: "portal_submission", metadata: meta })).toBe(
      "/app/projects/client-proj/checklist"
    )
  })

  it("returns null for portal_submission when slug missing", () => {
    expect(resolveLink({ type: "portal_submission", metadata: {} })).toBeNull()
  })

  it("returns tracking URL for tracking_click", () => {
    const meta = { opportunity_slug: "big-deal" }
    expect(resolveLink({ type: "tracking_click", metadata: meta })).toBe(
      "/app/opportunities/big-deal/tracking"
    )
  })

  it("returns null for tracking_click when slug missing", () => {
    expect(resolveLink({ type: "tracking_click", metadata: {} })).toBeNull()
  })

  it("returns null for unknown type", () => {
    expect(resolveLink({ type: "unknown_type", metadata: {} })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run __tests__/unit/notifications/resolve-link.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolveLink`**

Create `lib/notifications/resolve-link.ts`:

```typescript
type NotificationInput = {
  type: string
  metadata: Record<string, any>
}

/**
 * Resolves a deep-link URL from a notification's type and metadata.
 * Returns null when required metadata fields are absent (legacy notifications).
 */
export function resolveLink(notification: NotificationInput): string | null {
  const { type, metadata } = notification

  switch (type) {
    case "member_joined":
      return "/app/agency"

    case "task_comment":
    case "task_assigned":
    case "task_mention": {
      const { project_slug, task_prefix, task_number } = metadata
      if (!project_slug || !task_prefix || task_number == null) return null
      return `/app/projects/${project_slug}/board?task=${task_prefix}-${task_number}`
    }

    case "opportunity_status_changed": {
      const { opportunity_slug } = metadata
      if (!opportunity_slug) return null
      return `/app/opportunities/${opportunity_slug}`
    }

    case "portal_submission": {
      const { project_slug } = metadata
      if (!project_slug) return null
      return `/app/projects/${project_slug}/checklist`
    }

    case "tracking_click": {
      const { opportunity_slug } = metadata
      if (!opportunity_slug) return null
      return `/app/opportunities/${opportunity_slug}/tracking`
    }

    default:
      return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run __tests__/unit/notifications/resolve-link.test.ts
```

Expected: all 12 tests pass.

- [ ] **Step 5: Update NotificationCenter.tsx**

Add the import at the top of `components/NotificationCenter.tsx` (after existing imports):
```typescript
import { resolveLink } from "@/lib/notifications/resolve-link"
```

Inside `NotificationItem`, compute `link` at the top of the component body (before `handleClick`), then use it to conditionally apply cursor styles and drive navigation.

Replace lines 37–45 and the `<div onClick={handleClick} className={cn(...)}` opening tag at line 49–54:

Old:
```typescript
  const handleClick = async () => {
    if (isUnread) {
      await markAsRead(notification.id)
      onRead()
    }
    const meta = notification.metadata
    if (meta?.task_id) router.push(`/app/projects`)
    if (meta?.opportunity_id) router.push(`/app/opportunities`)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex cursor-pointer gap-4 p-4 transition-all duration-300",
        "hover:bg-muted/80 active:scale-[0.98]",
        isUnread ? "bg-card" : "opacity-70"
      )}
    >
```

New:
```typescript
  const link = resolveLink(notification)

  const handleClick = async () => {
    if (isUnread) {
      await markAsRead(notification.id)
      onRead()
    }
    if (link) router.push(link)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex gap-4 p-4 transition-all duration-300",
        link ? "cursor-pointer hover:bg-muted/80 active:scale-[0.98]" : "cursor-default",
        isUnread ? "bg-card" : "opacity-70"
      )}
    >
```

- [ ] **Step 6: Commit**

```bash
git add lib/notifications/resolve-link.ts __tests__/unit/notifications/resolve-link.test.ts components/NotificationCenter.tsx
git commit -m "feat: add resolveLink utility and wire NotificationCenter deep links"
```

---

## Task 2: Enrich `addTaskComment` metadata (task.server.ts)

**Files:**
- Modify: `actions/task.server.ts` (lines 120–160)

- [ ] **Step 1: Expand the task SELECT to include project slug, prefix, and task number**

In `actions/task.server.ts`, the inner task fetch inside `addTaskComment` currently reads:
```typescript
        const { data: task } = await supabase
            .from("tasks")
            .select("created_by, assignee_id, title, agency_id")
            .eq("id", taskId)
            .single();
```

Replace with:
```typescript
        const { data: task } = await supabase
            .from("tasks")
            .select("created_by, assignee_id, title, agency_id, task_number, project:projects!tasks_project_id_fkey(slug, task_prefix)")
            .eq("id", taskId)
            .single();
```

Note: `task_prefix` lives on the `projects` table, not `tasks` — both `slug` and `task_prefix` come from the join.

- [ ] **Step 2: Pass the new fields in metadata for both recipient loops**

In the same function, both `createNotification` calls use `metadata: { task_id: taskId }`. Replace both with:

```typescript
                metadata: {
                    task_id: taskId,
                    project_slug: (task.project as any)?.slug ?? null,
                    task_number: task.task_number,
                    task_prefix: (task.project as any)?.task_prefix ?? null,
                },
```

Apply this to both calls: the `commentRecipients` loop and the `mentionedIds` loop.

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add actions/task.server.ts
git commit -m "feat: enrich task_comment notification metadata with project slug and task number"
```

---

## Task 3: Enrich `createTask` metadata (project.server.ts)

**Files:**
- Modify: `actions/project.server.ts` (around lines 354–412, the `createTask` function)

- [ ] **Step 1: Add project slug/prefix query after task insert**

In `createTask`, after `const nextNumber = ...` is computed and before `assignee` notification, add a project fetch. The project ID is already known (`projectId`). But we need `slug` and `task_prefix`. Add a SELECT right after computing `nextNumber`:

```typescript
    const { data: projectInfo } = await supabase
      .from("projects")
      .select("slug, task_prefix")
      .eq("id", projectId)
      .single();
```

- [ ] **Step 2: Pass the new fields in the notification metadata**

In `createTask`, the existing notification call uses:
```typescript
        metadata: { task_id: (newTask as any).id },
```

Replace with:
```typescript
        metadata: {
          task_id: (newTask as any).id,
          project_slug: projectInfo?.slug ?? null,
          task_number: nextNumber,
          task_prefix: projectInfo?.task_prefix ?? null,
        },
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add actions/project.server.ts
git commit -m "feat: enrich task_assigned notification metadata in createTask"
```

---

## Task 4: Enrich `updateTaskDetails` metadata (project.server.ts)

**Files:**
- Modify: `actions/project.server.ts` (around lines 414–491, the `updateTaskDetails` function)

- [ ] **Step 1: Expand the currentTask SELECT to include project info**

In `updateTaskDetails`, the current SELECT is:
```typescript
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assignee_id, agency_id")
      .eq("id", taskId)
      .single();
```

Replace with:
```typescript
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assignee_id, agency_id, task_number, project:projects!tasks_project_id_fkey(slug, task_prefix)")
      .eq("id", taskId)
      .single();
```

Note: `task_prefix` lives on the `projects` table, not `tasks` — both `slug` and `task_prefix` come from the join.

- [ ] **Step 2: Update the `task_assigned` notification metadata**

In `updateTaskDetails`, the existing `task_assigned` notification metadata is:
```typescript
        metadata: { task_id: taskId },
```

Replace with:
```typescript
        metadata: {
          task_id: taskId,
          project_slug: (currentTask.project as any)?.slug ?? null,
          task_number: currentTask.task_number,
          task_prefix: (currentTask.project as any)?.task_prefix ?? null,
        },
```

- [ ] **Step 3: Update the `task_mention` notification metadata**

In `updateTaskDetails`, the existing `task_mention` notification metadata is:
```typescript
            metadata: { task_id: taskId },
```

Replace with:
```typescript
            metadata: {
              task_id: taskId,
              project_slug: (currentTask.project as any)?.slug ?? null,
              task_number: currentTask.task_number,
              task_prefix: (currentTask.project as any)?.task_prefix ?? null,
            },
```

- [ ] **Step 4: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add actions/project.server.ts
git commit -m "feat: enrich task_assigned and task_mention metadata in updateTaskDetails"
```

---

## Task 5: Enrich `updateOpportunityStatus` metadata (opportunity.server.ts)

**Files:**
- Modify: `actions/opportunity.server.ts` (lines 173–233)

- [ ] **Step 1: Add `slug` to the opportunities SELECT**

In `updateOpportunityStatus`, the current SELECT is:
```typescript
    const { data: opp } = await supabase
        .from("opportunities")
        .select("status, agency_id, name")
        .eq("id", opportunityId)
        .single();
```

Replace with:
```typescript
    const { data: opp } = await supabase
        .from("opportunities")
        .select("status, agency_id, name, slug")
        .eq("id", opportunityId)
        .single();
```

- [ ] **Step 2: Pass `opportunity_slug` in notification metadata**

In the same function, the existing `createNotification` call has:
```typescript
            metadata: { opportunity_id: opportunityId, from: opp.status, to: status },
```

Replace with:
```typescript
            metadata: { opportunity_id: opportunityId, opportunity_slug: opp.slug, from: opp.status, to: status },
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add actions/opportunity.server.ts
git commit -m "feat: enrich opportunity_status_changed metadata with opportunity slug"
```

---

## Task 6: Enrich `submitClientContent` metadata (portal.server.ts)

**Files:**
- Modify: `actions/portal.server.ts` (lines 57–165)

- [ ] **Step 1: Add `slug` to the project SELECT**

In `submitClientContent`, the current SELECT is:
```typescript
        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select("id, is_portal_active, agency_id")
            .eq("magic_token", magicToken)
            .single();
```

Replace with:
```typescript
        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select("id, is_portal_active, agency_id, slug")
            .eq("magic_token", magicToken)
            .single();
```

- [ ] **Step 2: Pass `project_slug` in notification metadata**

In the same function, the existing `createNotification` call has:
```typescript
                    metadata: { project_id: project.id, checklist_item_id: itemId },
```

Replace with:
```typescript
                    metadata: { project_id: project.id, project_slug: project.slug, checklist_item_id: itemId },
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add actions/portal.server.ts
git commit -m "feat: enrich portal_submission metadata with project slug"
```

---

## Task 7: Enrich `tracking_click` metadata (route.ts)

**Files:**
- Modify: `app/t/[code]/route.ts`

- [ ] **Step 1: Extend tracking_links SELECT to join opportunity slug**

In `app/t/[code]/route.ts`, the current SELECT is:
```typescript
	const { data: link } = await supabase
		.from("tracking_links")
		.select("*, agencies(website)")
		.eq("short_code", code)
		.single();
```

Replace with:
```typescript
	const { data: link } = await supabase
		.from("tracking_links")
		.select("*, agencies(website), opportunity:opportunities(slug)")
		.eq("short_code", code)
		.single();
```

- [ ] **Step 2: Pass `opportunity_slug` in notification metadata**

In the same file, the existing `createNotification` call metadata is:
```typescript
				metadata: { tracking_link_id: link.id, device, os },
```

Replace with:
```typescript
				metadata: { tracking_link_id: link.id, opportunity_slug: (link.opportunity as any)?.slug ?? null, device, os },
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/t/[code]/route.ts
git commit -m "feat: enrich tracking_click metadata with opportunity slug"
```

---

## Task 8: Update send-digest Edge Function

**Files:**
- Modify: `supabase/functions/send-digest/index.ts`

- [ ] **Step 1: Fix `TYPE_TO_PREF` and `TYPE_META` type mismatch + add task_mention**

In `supabase/functions/send-digest/index.ts`, replace the two constant blocks:

Old `TYPE_TO_PREF` (lines 13–19):
```typescript
const TYPE_TO_PREF: Record<string, string> = {
    task_assigned: "notify_task_assigned",
    task_comment: "notify_task_comment",
    opportunity_status: "notify_opportunity_status",
    tracking_click: "notify_tracking_click",
    portal_submission: "notify_portal_submission",
};
```

New `TYPE_TO_PREF`:
```typescript
const TYPE_TO_PREF: Record<string, string> = {
    task_assigned: "notify_task_assigned",
    task_comment: "notify_task_comment",
    task_mention: "notify_task_comment",
    opportunity_status_changed: "notify_opportunity_status",
    tracking_click: "notify_tracking_click",
    portal_submission: "notify_portal_submission",
};
```

Old `TYPE_META` (lines 21–28):
```typescript
const TYPE_META: Record<string, { label: string; emoji: string }> = {
    task_assigned: { label: "Tâche assignée", emoji: "📋" },
    task_comment: { label: "Commentaire", emoji: "💬" },
    opportunity_status: { label: "Opportunité", emoji: "📊" },
    tracking_click: { label: "Lien cliqué", emoji: "🔗" },
    portal_submission: { label: "Portail client", emoji: "📁" },
    member_joined: { label: "Nouveau membre", emoji: "👋" },
};
```

New `TYPE_META`:
```typescript
const TYPE_META: Record<string, { label: string; emoji: string }> = {
    task_assigned: { label: "Tâche assignée", emoji: "📋" },
    task_comment: { label: "Commentaire", emoji: "💬" },
    task_mention: { label: "Mention", emoji: "🔔" },
    opportunity_status_changed: { label: "Opportunité", emoji: "📊" },
    tracking_click: { label: "Lien cliqué", emoji: "🔗" },
    portal_submission: { label: "Portail client", emoji: "📁" },
    member_joined: { label: "Nouveau membre", emoji: "👋" },
};
```

- [ ] **Step 2: Add `resolveLink` helper (Deno-side copy)**

After the `TYPE_META` block (before `formatDate`), add:

```typescript
function resolveLink(type: string, metadata: Record<string, any>): string | null {
    switch (type) {
        case "member_joined":
            return `${APP_URL}/app/agency`;
        case "task_comment":
        case "task_assigned":
        case "task_mention": {
            const { project_slug, task_prefix, task_number } = metadata;
            if (!project_slug || !task_prefix || task_number == null) return null;
            return `${APP_URL}/app/projects/${project_slug}/board?task=${task_prefix}-${task_number}`;
        }
        case "opportunity_status_changed": {
            const { opportunity_slug } = metadata;
            if (!opportunity_slug) return null;
            return `${APP_URL}/app/opportunities/${opportunity_slug}`;
        }
        case "portal_submission": {
            const { project_slug } = metadata;
            if (!project_slug) return null;
            return `${APP_URL}/app/projects/${project_slug}/checklist`;
        }
        case "tracking_click": {
            const { opportunity_slug } = metadata;
            if (!opportunity_slug) return null;
            return `${APP_URL}/app/opportunities/${opportunity_slug}/tracking`;
        }
        default:
            return null;
    }
}
```

- [ ] **Step 3: Add `metadata` to the notifications SELECT query**

In the `Deno.serve` handler, the current SELECT is:
```typescript
            .select(`
                id,
                user_id,
                type,
                title,
                body,
                created_at,
                profile:profiles!notifications_user_id_fkey (
```

Add `metadata,` after `created_at,`:
```typescript
            .select(`
                id,
                user_id,
                type,
                title,
                body,
                created_at,
                metadata,
                profile:profiles!notifications_user_id_fkey (
```

- [ ] **Step 4: Update `buildDigestHtml` signature and row rendering**

Update the function signature to accept `metadata`:

Old signature:
```typescript
function buildDigestHtml(firstName: string, notifications: Array<{ type: string; title: string; body: string | null; created_at: string }>): string {
```

New signature:
```typescript
function buildDigestHtml(firstName: string, notifications: Array<{ type: string; title: string; body: string | null; created_at: string; metadata: Record<string, any> }>): string {
```

Update the row rendering inside `buildDigestHtml`. Replace:
```typescript
    const rows = notifications.slice(0, 10).map((n) => {
        const meta = TYPE_META[n.type] ?? { label: n.type, emoji: "•" };
        return `
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px">${meta.emoji}</td>
          <td style="vertical-align:top;padding-bottom:12px">
            <div style="color:#111827;font-size:14px;font-weight:600;margin:0 0 2px">${n.title}</div>
            ${n.body ? `<div style="color:#6b7280;font-size:13px;margin:0 0 4px">${n.body}</div>` : ""}
            <div style="color:#9ca3af;font-size:11px">${meta.label} · ${formatDate(n.created_at)}</div>
          </td>
        </tr>`;
    }).join("\n");
```

With:
```typescript
    const rows = notifications.slice(0, 10).map((n) => {
        const meta = TYPE_META[n.type] ?? { label: n.type, emoji: "•" };
        const link = resolveLink(n.type, n.metadata ?? {});
        const titleHtml = link
            ? `<a href="${link}" style="color:#6366f1;text-decoration:none;font-size:14px;font-weight:600">${n.title}</a>`
            : `<span style="color:#111827;font-size:14px;font-weight:600">${n.title}</span>`;
        const voirHtml = link
            ? ` <a href="${link}" style="color:#6366f1;font-size:11px;text-decoration:none">Voir →</a>`
            : "";
        return `
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px">${meta.emoji}</td>
          <td style="vertical-align:top;padding-bottom:12px">
            <div style="margin:0 0 2px">${titleHtml}</div>
            ${n.body ? `<div style="color:#6b7280;font-size:13px;margin:0 0 4px">${n.body}</div>` : ""}
            <div style="color:#9ca3af;font-size:11px">${meta.label} · ${formatDate(n.created_at)}${voirHtml}</div>
          </td>
        </tr>`;
    }).join("\n");
```

- [ ] **Step 5: Update `buildDigestHtml` call to pass metadata**

In the `Deno.serve` handler, the call to `buildDigestHtml` passes `userNotifs` directly. The `userNotifs` array now includes `metadata` from the SELECT, so no change to the call is needed — but verify the call site matches the new signature by reviewing this line:
```typescript
                const html = buildDigestHtml(firstName, userNotifs);
```

This is fine as-is since `userNotifs` elements now have `metadata`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-digest/index.ts
git commit -m "feat: add deep links to digest email and fix type mismatch in send-digest"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run all unit tests**

```bash
npm run test:run
```

Expected: all pass, including the new `resolve-link` tests.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test (dev server)**

```bash
npm run dev
```

- Open the notification center popover
- Click a task notification → should navigate to `/app/projects/{slug}/board?task={prefix}-{number}`
- Click an opportunity notification → should navigate to `/app/opportunities/{slug}`
- Verify clicking a legacy notification (no slug in metadata) → does not crash, simply doesn't navigate

- [ ] **Step 4: Commit if any final tweaks**

```bash
git add -p
git commit -m "fix: notification deep links edge cases"
```
