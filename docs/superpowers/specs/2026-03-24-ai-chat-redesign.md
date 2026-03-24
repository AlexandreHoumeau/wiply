# AI Chat Message Generator — Redesign Spec

**Date:** 2026-03-24
**Branch:** feature/chat-message-generator
**Scope:** Redesign the `AIMessageChat` component layout, feed notes and tracking link context to the AI, and fix saved drafts.

---

## Problem

The current `AIMessageChat` UI has three issues:

1. **Design** — channel/tone/length controls in a single toolbar row feel cluttered and visually flat.
2. **AI context** — the AI only uses `opportunity.description` (the static description field). Notes added via the timeline (`opportunity_events` with `event_type: "note_added"`) are ignored.
3. **Tracking link** — the link is silently auto-included (in `generateOpportunityMessage`) or never passed at all (in `sendChatMessage`). Users cannot choose whether to include it.
4. **Saved drafts** — `getAIGeneratedMessages` was never called in `AIMessageChat`, so the saved drafts list was always empty.

---

## Layout

Two-pane layout replacing the current single-column structure:

```
┌─────────────────────┬──────────────────────────────────┐
│  Sidebar (220px)    │  Chat (flex-1)                   │
│                     │                                  │
│  Channel            │  [Empty state / messages]        │
│  Tone               │                                  │
│  Length             │  ─────────────────────────────── │
│  ─────────────────  │  [Input + send button]           │
│  Tracking toggle    │                                  │
│  (if active link)   │                                  │
│  ─────────────────  │                                  │
│  Notes · {n}        │                                  │
│  (if notes exist)   │                                  │
│  ─────────────────  │                                  │
│  Brouillons         │                                  │
│  [draft list]       │                                  │
│  ─────────────────  │                                  │
│  Effacer conv.      │                                  │
└─────────────────────┴──────────────────────────────────┘
```

The top toolbar row is removed entirely.

---

## Sidebar Sections

### Channel
Five buttons in a 2-column grid (icon + label). Selected state: blue tint border (`border-blue-500 bg-blue-50`). Replaces the single horizontal row.

### Tone & Length
Two compact segmented button groups, each with a small muted label above ("Ton", "Longueur"). Same selected/unselected styling as channel.

### Tracking link toggle
Rendered **only** when an active tracking link (`is_active: true`) exists for the opportunity.

- Component: `Switch` + label "Inclure le lien de suivi"
- Default: `true`
- State: `includeTracking: boolean` in `AIMessageChat`
- Passed to `sendChatMessage` as `trackingLinkUrl` (the resolved URL when `true`, `null` when `false`)
- Separator above this section

### Notes
Rendered **only** when notes exist (timeline events with `event_type: "note_added"`).

- Header: `"Notes · {count}"` in `text-xs text-muted-foreground uppercase tracking-wider`
- Body: scrollable list of note snippets, each `line-clamp-2 text-xs text-muted-foreground`
- Read-only — no expand or edit
- Separator above this section

### Saved drafts
- Header: `"Brouillons"`
- Each draft: channel icon + truncated body preview (`line-clamp-1`) + relative date
- Click → copy full body to clipboard + `toast.success("Copié !")`
- Empty state: `"Aucun brouillon enregistré"` in muted text
- Refreshes after each successful save from `AssistantBubble`
- Separator above this section

### Clear conversation
- At the bottom of the sidebar
- `"Effacer la conversation"` — text button, `text-xs text-muted-foreground hover:text-destructive`
- Only rendered when messages exist
- Moves out of the chat area (was previously in the toolbar)

---

## Data Flow

### `page.tsx`
`getOpportunityBySlug` must resolve first (its result provides `opportunity.id`), then timeline and tracking are fetched in parallel:

```ts
const opportunity = await getOpportunityBySlug(slug);
if (!opportunity) return null;

const [timelineResult, trackingResult] = await Promise.all([
  getOpportunityTimeline(opportunity.id),   // new
  getTrackingLinks(opportunity.id),          // new
]);
```

Both `getOpportunityTimeline` and `getTrackingLinks` return `{ success, data, error? }`. Extract data defensively:

```ts
const notes = (timelineResult.data ?? []).filter(e => e.event_type === "note_added");
const trackingLinks = trackingResult.data ?? [];
```

Pass as props to `AIMessageChat`:
- `notes: OpportunityEvent[]`
- `trackingLinks: TrackingLinkRow[]`

### `TrackingLink` type
No `TrackingLink` type exists in `lib/validators/`. Define a minimal inline type in `AIMessageChat.tsx`:

```ts
type TrackingLinkRow = {
  id: string;
  short_code: string;
  is_active: boolean;
  campaign_name: string | null;
};
```

The prop type uses `TrackingLinkRow[]`. `page.tsx` casts `trackingResult.data` to this type on the way in.

### `AIMessageChat` props (additions)
```ts
{
  opportunity: OpportunityWithCompany;
  notes: OpportunityEvent[];          // new
  trackingLinks: TrackingLinkRow[];   // new
}
```

Derive inside component:
```ts
const activeTrackingLink = trackingLinks.find(l => l.is_active);
const trackingLinkUrl = includeTracking && activeTrackingLink
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/t/${activeTrackingLink.short_code}`
  : null;
```

### `sendChatMessage` call
The action already has `notes` and `trackingLinkUrl` params — wire them:

```ts
sendChatMessage({
  ...existingParams,
  notes: notes.map(n => n.metadata?.text).filter(Boolean) as string[],
  trackingLinkUrl,   // null when toggle off or no active link
})
```

Note: `getAIGeneratedMessages` and `sendChatMessage` are Server Actions (`"use server"`). They are called directly from the Client Component — no API route is needed. This is standard Next.js App Router behavior.

### Saved drafts
`AIMessageChat` calls `getAIGeneratedMessages(opportunityId)` on mount via a `useEffect`. Re-fetches after each successful save by adding an `onSaved?: () => void` prop to `AssistantBubble`, called after `result.success` in `handleSave`. The parent passes a callback that increments a counter state, triggering the drafts `useEffect` to re-fetch.

`AssistantBubble` updated props:
```ts
{
  content?: string;
  loading?: boolean;
  channel: string;
  opportunityId: string;
  onSaved?: () => void;   // new
}
```

---

## Files Changed

| File | Change |
|---|---|
| `app/app/opportunities/[slug]/message/page.tsx` | Add timeline + tracking fetches, pass as props |
| `app/app/opportunities/[slug]/_components/AIMessageChat.tsx` | Full redesign: sidebar layout, notes/tracking wiring, drafts fix; add `TrackingLinkRow` type; add `onSaved` prop to `AssistantBubble` |
| `actions/ai-messages.ts` | No changes needed — `sendChatMessage` already accepts `notes` and `trackingLinkUrl` |

---

## Out of Scope

- Expanding/editing notes in the sidebar
- Collapsible sidebar
- Pagination of saved drafts
- Changes to `AIMessageGenerator.tsx` (old form-based generator, separate component)
