# AI Chat Message Generator — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `AIMessageChat` with a left sidebar (controls + notes + drafts + tracking toggle), fix saved drafts, and wire opportunity notes + tracking link choice to the AI.

**Architecture:** Two-pane layout — 220px fixed left sidebar holds channel/tone/length controls, a tracking-link toggle (when active link exists), read-only notes snippets, and saved drafts. The right pane is the existing chat area unchanged. `page.tsx` fetches notes and tracking links server-side and passes them as props. No new server actions needed — `sendChatMessage` already accepts `notes` and `trackingLinkUrl`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (`Switch`, `ScrollArea`, `Textarea`, `Button`), Sonner toasts, Lucide icons, Mistral AI (unchanged).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/app/opportunities/[slug]/message/page.tsx` | Modify | Fetch notes + tracking links server-side, pass as props |
| `app/app/opportunities/[slug]/_components/AIMessageChat.tsx` | Rewrite | Two-pane layout, sidebar, wired data flow, drafts fix |

---

## Task 1: Update `page.tsx` to fetch notes and tracking links

**Files:**
- Modify: `app/app/opportunities/[slug]/message/page.tsx`

No tests needed — this is a thin Server Component with no logic beyond fetching + passing props.

- [ ] **Step 1: Replace the page contents**

Open `app/app/opportunities/[slug]/message/page.tsx`. Replace its entire contents with:

```tsx
import { getOpportunityBySlug } from "@/actions/opportunity.server";
import { getOpportunityTimeline } from "@/actions/timeline.server";
import { getTrackingLinks } from "@/actions/tracking.server";
import { AIMessageChat } from "../_components/AIMessageChat";
import { OpportunityEvent } from "@/lib/validators/oppotunities";

export default async function MessagePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const opportunity = await getOpportunityBySlug(slug);
    if (!opportunity) return null;

    const [timelineResult, trackingResult] = await Promise.all([
        getOpportunityTimeline(opportunity.id),
        getTrackingLinks(opportunity.id),
    ]);

    const notes = (timelineResult.data ?? []).filter(
        (e): e is OpportunityEvent => e.event_type === "note_added"
    );
    const trackingLinks = (trackingResult.data ?? []) as {
        id: string;
        short_code: string;
        is_active: boolean;
        campaign_name: string | null;
    }[];

    return (
        <div className="w-full max-w-5xl mx-auto h-full">
            <AIMessageChat
                opportunity={opportunity}
                notes={notes}
                trackingLinks={trackingLinks}
            />
        </div>
    );
}
```

Note: `max-w-4xl` → `max-w-5xl` to give the two-pane layout more room.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in `message/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/app/opportunities/\[slug\]/message/page.tsx
git commit -m "feat: fetch notes and tracking links in message page"
```

---

## Task 2: Rewrite `AIMessageChat.tsx` — sidebar layout + data wiring

**Files:**
- Rewrite: `app/app/opportunities/[slug]/_components/AIMessageChat.tsx`

This is a full rewrite of the component. Follow the steps below sequentially — each step adds one logical piece. The component won't render correctly until Step 2.6 (the full JSX), but TypeScript will be valid after each step.

### Step 2.0 — Update imports

- [ ] In `AIMessageChat.tsx`, update the import from `@/actions/ai-messages` to add `getAIGeneratedMessages` and `AIMessageRow`:

```tsx
import {
    AIMessageRow,
    ChatMessage,
    clearConversation,
    getAIGeneratedMessages,
    getConversation,
    saveAIGeneratedMessage,
    sendChatMessage,
} from "@/actions/ai-messages";
```

Also add `Switch` to the shadcn imports:

```tsx
import { Switch } from "@/components/ui/switch";
```

### Step 2.1 — Add `TrackingLinkRow` type + update props

At the top of `AIMessageChat.tsx`, after the imports, add the `TrackingLinkRow` type and update the `AIMessageChat` function signature:

- [ ] Replace the existing component signature:

```tsx
// Add this type near the top of the file (after imports, before other types):
type TrackingLinkRow = {
    id: string;
    short_code: string;
    is_active: boolean;
    campaign_name: string | null;
};
```

Update `AIMessageChat` props:

```tsx
export function AIMessageChat({
    opportunity,
    notes,
    trackingLinks,
}: {
    opportunity: OpportunityWithCompany;
    notes: import("@/lib/validators/oppotunities").OpportunityEvent[];
    trackingLinks: TrackingLinkRow[];
}) {
```

### Step 2.2 — Add new state variables

Inside `AIMessageChat`, after the existing state declarations (`messages`, `input`, `isLoading`, etc.), add:

- [ ] Add state for tracking toggle, drafts, and draft refresh:

```tsx
const activeTrackingLink = trackingLinks.find(l => l.is_active) ?? null;
const [includeTracking, setIncludeTracking] = useState(!!activeTrackingLink);
const [drafts, setDrafts] = useState<AIMessageRow[]>([]);
const [draftRefreshKey, setDraftRefreshKey] = useState(0);
```

### Step 2.3 — Add drafts `useEffect`

After the existing `useEffect` calls (conversation load + auto-scroll), add:

- [ ] Fetch saved drafts on mount and on each save:

```tsx
useEffect(() => {
    getAIGeneratedMessages(opportunity.id).then(({ data }) => {
        setDrafts(data);
    });
}, [opportunity.id, draftRefreshKey]);
```

### Step 2.4 — Derive `trackingLinkUrl` and wire to `dispatchMessage`

- [ ] Add just above `dispatchMessage`:

```tsx
const trackingLinkUrl =
    includeTracking && activeTrackingLink
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/t/${activeTrackingLink.short_code}`
        : null;
```

- [ ] Inside `dispatchMessage`, update the `sendChatMessage` call to pass notes and trackingLinkUrl:

```tsx
const result = await sendChatMessage({
    opportunityId: opportunity.id,
    agencyId,
    userMessage: userMessage.trim(),
    opportunity,
    channel,
    tone,
    length,
    notes: notes.map(n => n.metadata?.text).filter(Boolean) as string[],
    trackingLinkUrl,
});
```

### Step 2.5 — Add `onSaved` prop to `AssistantBubble` + trigger refresh

- [ ] Update `AssistantBubble` props interface (the inner sub-component):

```tsx
function AssistantBubble({
    content,
    loading,
    channel,
    opportunityId,
    onSaved,
}: {
    content?: string;
    loading?: boolean;
    channel: string;
    opportunityId: string;
    onSaved?: () => void;
}) {
```

- [ ] Inside `handleSave` in `AssistantBubble`, after `setSaved(true); toast.success(...)`, call:

```tsx
onSaved?.();
```

- [ ] In the parent JSX where `AssistantBubble` is rendered (both the mapped messages and the loading bubble), pass:

```tsx
onSaved={() => setDraftRefreshKey(k => k + 1)}
```

### Step 2.6 — Build the full two-pane JSX

- [ ] Replace the entire `return (...)` block in `AIMessageChat` with the two-pane layout below.

Key things to note before writing:
- The outer container switches from `flex-col` to `flex-row`
- The sidebar has its own `overflow-y-auto`
- The chat area is `flex-1 flex flex-col min-h-0` (required for inner ScrollArea to work)
- `Switch` is imported from `@/components/ui/switch`
- The `channelOptions`, `toneOptions`, `lengthOptions` arrays already exist — reuse them
- `formatRelativeDate` helper needed for draft timestamps — use a simple inline helper

Add this helper above the `AIMessageChat` function (near the other helpers like `extractEmailParts`):

```tsx
function formatRelativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
```

Add `Switch` to the imports at the top:

```tsx
import { Switch } from "@/components/ui/switch";
```

Now replace the return block:

```tsx
return (
    <div className="flex h-full min-h-0 bg-background border rounded-lg overflow-hidden">
        {/* ── LEFT SIDEBAR ── */}
        <div className="w-[220px] shrink-0 flex flex-col border-r bg-card overflow-y-auto">
            <div className="flex flex-col gap-4 p-3">

                {/* Channel */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Canal</p>
                    <div className="grid grid-cols-2 gap-1">
                        {channelOptions.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setChannel(value)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer",
                                    channel === value
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tone */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ton</p>
                    <div className="flex flex-col gap-1">
                        {toneOptions.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setTone(value)}
                                className={cn(
                                    "px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer text-left",
                                    tone === value
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Length */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Longueur</p>
                    <div className="flex flex-col gap-1">
                        {lengthOptions.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setLength(value)}
                                className={cn(
                                    "px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer text-left",
                                    length === value
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tracking link toggle — only when active link exists */}
                {activeTrackingLink && (
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex items-center justify-between gap-2">
                            <label htmlFor="tracking-toggle" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                                Inclure le lien de suivi
                            </label>
                            <Switch
                                id="tracking-toggle"
                                checked={includeTracking}
                                onCheckedChange={setIncludeTracking}
                            />
                        </div>
                    </>
                )}

                {/* Notes — only when notes exist */}
                {notes.length > 0 && (
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                Notes · {notes.length}
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {notes.map((note, i) => (
                                    <p
                                        key={i}
                                        className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                                    >
                                        {note.metadata?.text}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Saved drafts */}
                <>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Brouillons</p>
                        {drafts.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Aucun brouillon enregistré</p>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {drafts.map((draft) => {
                                    const draftChannel = channelOptions.find(c => c.value === draft.channel);
                                    const Icon = draftChannel?.icon;
                                    return (
                                        <button
                                            key={draft.id}
                                            onClick={() => {
                                                navigator.clipboard.writeText(draft.body);
                                                toast.success("Copié !");
                                            }}
                                            className="flex items-start gap-1.5 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors group"
                                        >
                                            {Icon && <Icon className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground line-clamp-1 group-hover:text-foreground">
                                                    {draft.body}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {formatRelativeDate(draft.created_at)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>

                {/* Clear conversation — only when messages exist */}
                {messages.length > 0 && (
                    <>
                        <div className="h-px bg-border" />
                        <button
                            onClick={handleClear}
                            disabled={isPending}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Effacer la conversation
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className="flex-1 flex flex-col min-h-0">
            {isEmpty ? (
                <div className="flex-1 flex">
                    <EmptyState
                        onGenerate={handleGenerate}
                        onSuggestion={handleSuggestion}
                        isLoading={isLoading}
                    />
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-5 flex flex-col gap-5">
                        {messages.map((msg, i) =>
                            msg.role === "user"
                                ? <UserBubble key={i} content={msg.content} />
                                : (
                                    <AssistantBubble
                                        key={i}
                                        content={msg.content}
                                        channel={channel}
                                        opportunityId={opportunity.id}
                                        onSaved={() => setDraftRefreshKey(k => k + 1)}
                                    />
                                )
                        )}
                        {isLoading && (
                            <AssistantBubble
                                loading
                                channel={channel}
                                opportunityId={opportunity.id}
                                onSaved={() => setDraftRefreshKey(k => k + 1)}
                            />
                        )}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            )}

            {/* Input */}
            <div className="border-t px-4 py-3 flex gap-2 items-end shrink-0 bg-card">
                <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isEmpty
                        ? "Ou décrivez précisément ce que vous voulez..."
                        : "Donnez une instruction : \"rends-le plus court\", \"change le ton\"..."
                    }
                    className="flex-1 min-h-0 resize-none text-sm"
                    rows={2}
                />
                <div className="flex flex-col gap-1.5 self-end">
                    {isEmpty && (
                        <Button
                            onClick={handleGenerate}
                            disabled={isPending || isLoading}
                            size="sm"
                            className="gap-1.5 whitespace-nowrap"
                        >
                            <Zap className="h-3.5 w-3.5" />
                            Générer
                        </Button>
                    )}
                    <Button
                        onClick={handleSend}
                        disabled={isPending || isLoading || !input.trim()}
                        size="sm"
                        variant={isEmpty ? "outline" : "default"}
                        className="self-end"
                    >
                        <SendHorizonal className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
);
```

### Step 2.7 — Remove the old toolbar from the JSX

The old toolbar div (the `<div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-card shrink-0">` block) no longer exists — the return block above replaces it entirely. Verify the old toolbar is gone after the rewrite.

### Step 2.8 — Verify TypeScript + lint

- [ ] Run TypeScript check:

```bash
npm run build 2>&1 | grep -E "error|Error" | head -30
```

Expected: zero errors. Common issues to watch for:
- `OpportunityEvent` import path (`@/lib/validators/oppotunities` — note the typo in `oppotunities`)
- `AIMessageRow` imported from `@/actions/ai-messages`
- `Switch` imported from `@/components/ui/switch`

- [ ] Run lint:

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Expected: no new errors.

### Step 2.9 — Commit

- [ ] Commit the full rewrite:

```bash
git add app/app/opportunities/\[slug\]/_components/AIMessageChat.tsx
git commit -m "feat: redesign AI chat with sidebar layout, notes context, tracking toggle, and drafts fix"
```

---

## Task 3: Smoke test in dev

- [ ] Start the dev server:

```bash
npm run dev
```

- [ ] Navigate to any opportunity's message page (`/app/opportunities/[slug]/message`) and verify:
  1. Two-pane layout renders (sidebar left, chat right)
  2. Channel/tone/length controls work and update AI output
  3. Tracking toggle appears only when an active tracking link exists for the opportunity; toggling off removes the link from the generated message
  4. Notes section appears only when notes exist; snippets are read-only
  5. Saved drafts list populates after saving a message; clicking copies to clipboard
  6. "Effacer la conversation" appears in sidebar only when messages exist
  7. Empty state and generate button still work

- [ ] Commit any fixups if needed, then done.
