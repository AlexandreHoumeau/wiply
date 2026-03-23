# Notification Deep Links — Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Problem

Notifications in the notification center navigate to generic list pages (`/app/projects`, `/app/opportunities`) instead of the specific item. Digest emails have a single CTA button with no per-notification links. Users cannot jump directly from a notification to the relevant content.

## Goal

Every notification — both in the notification center popover and in digest emails — links directly to the exact resource it refers to.

## Approach

Enrich `metadata` at notification creation time with the routing data needed to build a deep link. The UI and email compute the URL from metadata without any additional DB lookup.

## Metadata enrichment

### task_comment, task_assigned, task_mention
**Added fields:** `project_slug`, `task_number`, `task_prefix`
**Target URL:** `/app/projects/{project_slug}/board?task={task_prefix}-{task_number}`

**Files:**
- `actions/task.server.ts` (`addTaskComment`) — expand task query to include `task_number`, `task_prefix`, and a project join for `slug`. This function emits **only `task_comment`** — including for mention-detected recipients. It does not and should not emit `task_mention`.
- `actions/project.server.ts` (`createTask`) — add a new `SELECT slug, task_prefix FROM projects WHERE id = projectId` query (the function currently has no project query at all — it only uses `projectId` for the task insert); use the already-computed `nextNumber` for `task_number`; only emits `task_assigned`
- `actions/project.server.ts` (`updateTaskDetails`) — expand `currentTask` query to join project for `slug`, `task_prefix`, `task_number`; emits `task_assigned` and `task_mention`. This is the **only** code path that emits `task_mention`.

### opportunity_status_changed
**Added fields:** `opportunity_slug`
**Target URL:** `/app/opportunities/{opportunity_slug}`

**Files:**
- `actions/opportunity.server.ts` — add `slug` to the opportunities SELECT (currently selects `status, agency_id, name`; must become `status, agency_id, name, slug`); then add `opportunity_slug: opp.slug` to metadata

### portal_submission
**Added fields:** `project_slug`
**Target URL:** `/app/projects/{project_slug}/checklist`

**Files:**
- `actions/portal.server.ts` — add `slug` to the project SELECT (currently selects `id, is_portal_active, agency_id`; must become `id, is_portal_active, agency_id, slug`); then add `project_slug: project.slug` to metadata

### tracking_click
**Added fields:** `opportunity_slug`
**Target URL:** `/app/opportunities/{opportunity_slug}/tracking`

**Files:**
- `app/t/[code]/route.ts` — extend `tracking_links` select to join `opportunities(slug)`; add `opportunity_slug` to metadata

### member_joined
**No metadata change.** Link is always `/app/agency` (static).

## NotificationCenter.tsx

Replace the existing ad-hoc `if (meta?.task_id)` / `if (meta?.opportunity_id)` navigation logic in `NotificationItem.handleClick` with a single `resolveLink(notification)` function:

```ts
function resolveLink(n: Notification): string | null {
  const m = n.metadata
  switch (n.type) {
    case 'task_comment':
    case 'task_assigned':
    case 'task_mention':
      if (m?.project_slug && m?.task_number != null && m?.task_prefix)
        return `/app/projects/${m.project_slug}/board?task=${m.task_prefix}-${m.task_number}`
      return null
    case 'opportunity_status_changed':
      return m?.opportunity_slug ? `/app/opportunities/${m.opportunity_slug}` : null
    case 'member_joined':
      return '/app/agency'
    case 'portal_submission':
      return m?.project_slug ? `/app/projects/${m.project_slug}/checklist` : null
    case 'tracking_click':
      return m?.opportunity_slug ? `/app/opportunities/${m.opportunity_slug}/tracking` : null
    default:
      return null
  }
}
```

If `resolveLink` returns `null` (old notifications without enriched metadata), clicking still marks as read but does not navigate — no regression. Notification items with no resolvable link must **not** show a pointer cursor or any visual navigation affordance (remove `cursor-pointer` / hover styles for those items).

## Digest email

### send-digest/index.ts (Edge Function) — the only runtime email path

- Fix pre-existing type mismatch: `TYPE_TO_PREF` and `TYPE_META` currently use `"opportunity_status"` but notifications are stored as `"opportunity_status_changed"` — update both maps to use `"opportunity_status_changed"`
- Add `task_mention` to `TYPE_META` with `{ label: "Mention", emoji: "🔔" }` — it is currently absent, causing the fallback `"•"` emoji and raw type string to appear in digest emails. No preference column (`notify_task_mention`) exists, so `TYPE_TO_PREF` is left unchanged; `task_mention` already passes through the preference filter because `undefined` is falsy (the guard is `if (prefKey && !profile[prefKey]) continue`)
- Add `metadata` to the notifications SELECT query and add `metadata: Record<string, unknown> | null` to the `buildDigestHtml` inline type annotation
- In `buildDigestHtml`, add a Deno-side `resolveLink(type: string, metadata: Record<string, unknown> | null): string | null` helper (same switch logic as the UI helper, but takes `type` and `metadata` separately rather than a full notification object since the Notification type is not available in Deno)
- If a link exists: wrap the notification title in an `<a>` tag and add a small "Voir →" link at the end of the row
- `tracking_links` has a confirmed `opportunity_id` FK — joining `opportunities(slug)` in `app/t/[code]/route.ts` is valid
- The footer "Voir toutes les notifications" button is unchanged

### emails/digest.tsx (React Email component) — preview/dev only

This component is **not** used at runtime; `send-digest/index.ts` builds raw HTML directly. Changes here are optional and only affect local dev previews:
- Add `link?: string` to the `DigestNotification` type
- Make the notification title a link when `link` is present

## Out of scope
- Changing notification preferences or opt-in logic
- Adding new notification types
- Push/browser notifications
