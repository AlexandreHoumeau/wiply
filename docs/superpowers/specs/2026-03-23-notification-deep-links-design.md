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
- `actions/task.server.ts` — expand task query to include `task_number`, `task_prefix`, and a project join for `slug`
- `actions/project.server.ts` (`createTask`) — query project by `projectId` for `slug` + `task_prefix`; use `nextNumber` for `task_number`
- `actions/project.server.ts` (`updateTaskDetails`) — expand `currentTask` query to join project for `slug`, `task_prefix`, `task_number`

### opportunity_status_changed
**Added fields:** `opportunity_slug`
**Target URL:** `/app/opportunities/{opportunity_slug}`

**Files:**
- `actions/opportunity.server.ts` — `opp.slug` is already in scope; add it to metadata

### portal_submission
**Added fields:** `project_slug`
**Target URL:** `/app/projects/{project_slug}/checklist`

**Files:**
- `actions/portal.server.ts` — `project.slug` is already in scope (queried by project_id); add it to metadata

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

If `resolveLink` returns `null` (old notifications without enriched metadata), clicking marks as read but does not navigate — no regression.

## Digest email

### send-digest/index.ts (Edge Function)
- Add `metadata` to the notifications SELECT query
- In `buildDigestHtml`, call a `resolveLink(type, metadata)` helper per notification
- If a link exists: wrap the notification title in an `<a>` tag and add a small "Voir →" link at the end of the row
- The footer "Voir toutes les notifications" button is unchanged

### emails/digest.tsx (React Email component)
- Add `link?: string` to the `DigestNotification` type
- Make the notification title a link when `link` is present

## Out of scope
- Changing notification preferences or opt-in logic
- Adding new notification types
- Push/browser notifications
