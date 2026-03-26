# Pro Plan Gating UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all PRO-only features visibly locked for FREE users — sidebar indicators, persistent upgrade CTA, and consistent upgrade modal triggers across the app.

**Architecture:** Create a reusable `<ProPageGate>` component for page-level locking, refactor the sidebar to show amber-styled locked items + a persistent FREE upgrade bloc, and fix 2 missing `openUpgradeDialog` triggers (AgencyTeamCard invite button, TrackingLinksManager limit hit).

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, shadcn/ui, `useUpgradeDialog()` from `providers/UpgradeDialogProvider.tsx`, `isProPlan()` from `lib/validators/agency.ts`, `createCheckoutSession` from `actions/billing.server.ts`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/pro-page-gate.tsx` | **Create** | Reusable full-page lock screen for PRO features |
| `app/app/quotes/page.tsx` | **Modify** (lines 65–82) | Replace inline lock screen with `<ProPageGate>` |
| `app/app/agency/(config)/ai/page.tsx` | **Modify** | Add plan check, render `<ProPageGate>` for FREE users |
| `components/app-sidebar.tsx` | **Modify** | Style C locked items + FREE upgrade bloc in sidebar |
| `app/app/agency/_components/AgencyTeamCard.tsx` | **Modify** | Gate invite button with `isProPlan` check + upgrade dialog |
| `app/app/opportunities/[slug]/_components/TrackingLinksManager.tsx` | **Modify** | Open upgrade dialog when tracking limit hit |

---

## Task 1: Create `<ProPageGate>` component

**Files:**
- Create: `components/pro-page-gate.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/pro-page-gate.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURE_COPY = {
    quotes: {
        description: 'Créez des propositions commerciales professionnelles avec le plan PRO.',
    },
    ai: {
        description: "Configurez et utilisez l'agent IA avec le plan PRO.",
    },
} as const

type ProPageGateProps = {
    feature: keyof typeof FEATURE_COPY
}

export function ProPageGate({ feature }: ProPageGateProps) {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
                <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-semibold tracking-tight">Fonctionnalité PRO</h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {FEATURE_COPY[feature].description}
                </p>
            </div>
            <Button
                size="sm"
                onClick={() => router.push('/app/agency/billing')}
                className="rounded-full px-5"
            >
                Passer au plan PRO
            </Button>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pro-page-gate.tsx
git commit -m "feat: add ProPageGate reusable lock screen component"
```

---

## Task 2: Use `<ProPageGate>` on the Quotes page

**Files:**
- Modify: `app/app/quotes/page.tsx`

The existing inline lock screen is at lines 65–82:
```tsx
if (!agency || !isProPlan(agency)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Fonctionnalité PRO</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Créez des propositions commerciales professionnelles avec le plan PRO.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/app/agency/billing")} className="rounded-full px-5">
          Passer au plan PRO
        </Button>
      </div>
    )
  }
```

- [ ] **Step 1: Add `ProPageGate` import to quotes page**

At the top of `app/app/quotes/page.tsx`, add the import alongside existing imports:
```tsx
import { ProPageGate } from "@/components/pro-page-gate"
```

- [ ] **Step 2: Replace the inline lock screen**

Replace the entire block from `if (!agency || !isProPlan(agency)) {` to its closing `}` (lines 65–82) with:
```tsx
if (!agency || !isProPlan(agency)) {
    return <ProPageGate feature="quotes" />
}
```

- [ ] **Step 3: Remove now-unused imports**

Remove `Lock` from the lucide-react import line (it's no longer used in this file).

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: no TypeScript or compilation errors.

- [ ] **Step 5: Commit**

```bash
git add app/app/quotes/page.tsx
git commit -m "feat: use ProPageGate on quotes page"
```

---

## Task 3: Gate the AI config page

**Files:**
- Modify: `app/app/agency/(config)/ai/page.tsx`

This is currently a Server Component with no plan check. It renders `<AIConfigForm />`.

- [ ] **Step 1: Replace the file content**

The current file is:
```tsx
import { Wand2 } from "lucide-react"
import AIConfigForm from "./ai-config-form"

export default function AISettingsPage() {
    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Intelligence Artificielle</h1>
                </div>
                <p className="text-slate-500 text-sm">Configurez la "voix" et les connaissances de votre agence digitale.</p>
            </div>

            <AIConfigForm />
        </div>
    )
}
```

Replace it with:
```tsx
import { Wand2 } from "lucide-react"
import AIConfigForm from "./ai-config-form"
import { ProPageGate } from "@/components/pro-page-gate"
import { fetchSettingsData } from "@/actions/settings.server"
import { isProPlan } from "@/lib/validators/agency"

export default async function AISettingsPage() {
    const { agency } = await fetchSettingsData()

    if (!isProPlan(agency)) {
        return <ProPageGate feature="ai" />
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Intelligence Artificielle</h1>
                </div>
                <p className="text-slate-500 text-sm">Configurez la "voix" et les connaissances de votre agence digitale.</p>
            </div>

            <AIConfigForm />
        </div>
    )
}
```

Note: `fetchSettingsData` is already used by the parent agency page — it fetches from the same Supabase session. No extra DB call overhead since it's cached per-request via Next.js.

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/agency/\(config\)/ai/page.tsx
git commit -m "feat: gate AI config page for FREE plan users"
```

---

## Task 4: Sidebar — Style C locked items + FREE upgrade bloc

**Files:**
- Modify: `components/app-sidebar.tsx`

This task has 2 parts: (A) restyle locked NavItems with Style C amber + click opens upgrade dialog, (B) add a FREE upgrade bloc above the user footer.

### Part A — Restyle locked NavItem

Currently `NavItem` has `locked` prop but renders a dead `<div>`. We need it to be a clickable `<button>` that calls `openUpgradeDialog`, with Style C amber appearance.

- [ ] **Step 1: Add `useUpgradeDialog` import**

At the top of `components/app-sidebar.tsx`, add to existing imports:
```tsx
import { useUpgradeDialog } from '@/providers/UpgradeDialogProvider'
import { createCheckoutSession } from '@/actions/billing.server'
```

- [ ] **Step 2: Pass `agencyId` and `openUpgradeDialog` to `NavItem`**

In the `sidebarContent` function, find the `mainNav.map(...)` call (line ~114):
```tsx
{mainNav.map((item) => (
    <NavItem key={item.href} item={item} active={isLinkActive(item.href)} isCollapsed={!isMobile && isCollapsed} primaryColor={primaryColor} locked={(item as any).proOnly && (!agency || !isProPlan(agency))} />
))}
```

Replace with:
```tsx
{mainNav.map((item) => (
    <NavItem
        key={item.href}
        item={item}
        active={isLinkActive(item.href)}
        isCollapsed={!isMobile && isCollapsed}
        primaryColor={primaryColor}
        locked={(item as any).proOnly && (!agency || !isProPlan(agency))}
        agencyId={agency?.id ?? ''}
        openUpgradeDialog={openUpgradeDialog}
    />
))}
```

- [ ] **Step 3: Add `useUpgradeDialog` call in `AppSidebar`**

In the `AppSidebar` component body, below the existing `useAgency()` destructure, add:
```tsx
const { openUpgradeDialog } = useUpgradeDialog()
const [isCheckoutPending, startCheckout] = useTransition()
```

- [ ] **Step 4: Replace the `NavItem` function**

Replace the entire `NavItem` function (from `function NavItem(` to its closing `}`, around lines 199–275) with:

```tsx
function NavItem({ item, active, isCollapsed, primaryColor, locked, agencyId, openUpgradeDialog }: {
    item: { label: string; href: string; icon: React.ElementType }
    active: boolean
    isCollapsed: boolean
    primaryColor: string
    locked?: boolean
    agencyId?: string
    openUpgradeDialog?: (reason: string, agencyId: string) => void
}) {
    function handleLockedClick() {
        if (openUpgradeDialog && agencyId) {
            openUpgradeDialog(
                `Cette fonctionnalité est réservée au plan PRO. Passez au PRO pour y accéder.`,
                agencyId
            )
        }
    }

    const navContent = (
        <Button
            variant="ghost"
            className={cn(
                "w-full transition-all duration-200 group relative overflow-hidden h-10 flex items-center",
                isCollapsed ? "justify-center px-0 w-10 mx-auto" : "justify-start gap-3 px-3",
                locked
                    ? "bg-amber-50/60 border border-amber-200/60 text-amber-800/70 hover:bg-amber-100/60 opacity-80"
                    : active
                        ? "bg-sidebar-accent/50"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            )}
            style={!locked && active ? { color: primaryColor } : undefined}
        >
            {/* Active Indicator Line */}
            {active && !locked && (
                <motion.div
                    layoutId="sidebarActive"
                    className="absolute left-0 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: primaryColor }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}

            {/* Icon */}
            <item.icon
                className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    locked
                        ? "text-amber-600/50"
                        : !active && "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )}
                style={!locked && active ? { color: primaryColor } : undefined}
            />

            {/* Label */}
            {!isCollapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                        "text-sm whitespace-nowrap overflow-hidden flex-1 text-left",
                        active && !locked ? "font-bold" : "font-medium"
                    )}
                >
                    {item.label}
                </motion.span>
            )}

            {/* Pro Badge or Lock icon */}
            {locked && !isCollapsed && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                    PRO
                </span>
            )}
            {locked && isCollapsed && (
                <Lock className="absolute bottom-1 right-1 w-2.5 h-2.5 text-amber-600/60" />
            )}
        </Button>
    )

    if (locked) {
        return (
            <div className="block relative">
                {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button onClick={handleLockedClick} className="w-full">
                                {navContent}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">
                            {item.label} — PRO uniquement
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <button onClick={handleLockedClick} className="w-full">
                        {navContent}
                    </button>
                )}
            </div>
        )
    }

    return (
        <Link href={item.href} className="block relative">
            {isCollapsed ? (
                <Tooltip>
                    <TooltipTrigger asChild>{navContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">{item.label}</TooltipContent>
                </Tooltip>
            ) : navContent}
        </Link>
    )
}
```

- [ ] **Step 5: Add `Lock` to lucide-react imports**

In the lucide-react import at the top of the file, add `Lock`:
```tsx
import {
    Briefcase, Building2, ChevronsUpDown, FileText, Kanban, LayoutDashboard,
    Lock, LogOut, Settings, ShieldCheck, Users, PanelLeftClose, PanelLeftOpen, Layers
} from "lucide-react"
```

### Part B — FREE upgrade bloc

- [ ] **Step 6: Add the upgrade bloc to `sidebarContent`**

In the `sidebarContent` function, find the `{/* --- USER FOOTER --- */}` section (around line 131). Insert the following block **just before** `<div className="p-3 mt-auto border-t border-sidebar-border">`:

```tsx
{/* --- FREE UPGRADE BLOC --- */}
{agency && !isProPlan(agency) && (
    <div className="px-3 pb-3">
        {(isMobile || !isCollapsed) ? (
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.25),_transparent_70%)]" />
                <div className="relative z-10">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Plan actuel</div>
                    <div className="text-base font-black text-white">FREE</div>
                    <button
                        onClick={() => {
                            startCheckout(async () => {
                                const result = await createCheckoutSession(agency.id)
                                if ('url' in result) window.location.href = result.url
                            })
                        }}
                        disabled={isCheckoutPending}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-2 text-[11px] font-bold text-white transition-colors disabled:opacity-50"
                    >
                        <Zap className="w-3 h-3 fill-current" />
                        {isCheckoutPending ? 'Redirection...' : 'Passer au PRO — 39€/mois'}
                    </button>
                </div>
            </div>
        ) : (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => {
                            startCheckout(async () => {
                                const result = await createCheckoutSession(agency.id)
                                if ('url' in result) window.location.href = result.url
                            })
                        }}
                        disabled={isCheckoutPending}
                        className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/30 transition-colors disabled:opacity-50"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">
                    Passer au PRO
                </TooltipContent>
            </Tooltip>
        )}
    </div>
)}
```

- [ ] **Step 7: Add `Zap` to lucide-react imports**

```tsx
import {
    Briefcase, Building2, ChevronsUpDown, FileText, Kanban, LayoutDashboard,
    Lock, LogOut, Settings, ShieldCheck, Users, PanelLeftClose, PanelLeftOpen, Layers, Zap
} from "lucide-react"
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: sidebar PRO lock style and FREE upgrade bloc"
```

---

## Task 5: Fix `AgencyTeamCard` — gate invite button for FREE users

**Files:**
- Modify: `app/app/agency/_components/AgencyTeamCard.tsx`

The `AgencyTeamCard` is used on the agency overview page (`/app/agency`). It shows an "Inviter" button that opens a dialog directly without checking the plan. When a FREE user submits, the server action returns an error which is shown as `toast.error`. We need to intercept the click.

Note: The settings page (`/app/agency/(config)/settings/page.tsx`) already gates this correctly. This fix targets the agency overview card.

- [ ] **Step 1: Add hooks to `AgencyTeamCard`**

Inside the `AgencyTeamCard` function body, below the existing `const isAdmin = profile.role === "agency_admin"` line, add:
```tsx
const { agency } = useAgency()
const { openUpgradeDialog } = useUpgradeDialog()
```

- [ ] **Step 2: Add `handleInviteClick` function**

Below the `openUpgradeDialog` line, add:
```tsx
function handleInviteClick() {
    if (!agency || !isProPlan(agency)) {
        openUpgradeDialog(
            "Le plan FREE ne permet pas d'inviter des collaborateurs. Passez au plan PRO pour inviter jusqu'à 5 membres.",
            agency?.id ?? ''
        )
        return
    }
    setDialogOpen(true)
}
```

- [ ] **Step 3: Replace the `DialogTrigger` with a plain button**

Find the `DialogTrigger asChild` wrapping the "Inviter" button (around line 196–199):
```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogTrigger asChild>
    <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      <UserPlus className="h-3.5 w-3.5" /> Inviter
    </button>
  </DialogTrigger>
```

Replace with (remove `DialogTrigger`, control `open` via `handleInviteClick`):
```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <button
    onClick={handleInviteClick}
    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
  >
    <UserPlus className="h-3.5 w-3.5" /> Inviter
  </button>
```

- [ ] **Step 4: Add required imports**

At the top of `app/app/agency/_components/AgencyTeamCard.tsx`, add:
```tsx
import { useAgency } from "@/providers/agency-provider"
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider"
import { isProPlan } from "@/lib/validators/agency"
```

Also remove `DialogTrigger` from the Dialog import since it's no longer used:
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/app/agency/_components/AgencyTeamCard.tsx
git commit -m "feat: gate invite button in AgencyTeamCard for FREE users"
```

---

## Task 6: Fix `TrackingLinksManager` — open upgrade dialog on limit hit

**Files:**
- Modify: `app/app/opportunities/[slug]/_components/TrackingLinksManager.tsx`

When `createTrackingLink` fails due to billing limit, it returns `{ success: false, error: "Vous avez atteint la limite..." }`. Currently the component shows a generic `toast.error("Erreur lors de la création du lien")` ignoring the `error` field.

- [ ] **Step 1: Add `useUpgradeDialog` import and hook**

At the top of the file, add:
```tsx
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider"
```

Inside the `TrackingLinksManager` component body, below `const { agency } = useAgency()`, add:
```tsx
const { openUpgradeDialog } = useUpgradeDialog()
```

- [ ] **Step 2: Update `handleCreateLink` to use upgrade dialog on limit error**

Find `handleCreateLink` (lines 54–73). Replace the `else` branch:

Current:
```tsx
} else {
    toast.error("Erreur lors de la création du lien");
}
```

Replace with:
```tsx
} else {
    const isLimitError = result.error?.includes('limite') || result.error?.includes('plan FREE')
    if (isLimitError && agencyId) {
        openUpgradeDialog(result.error ?? "Limite atteinte sur le plan FREE.", agencyId)
    } else {
        toast.error(result.error ?? "Erreur lors de la création du lien")
    }
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```
Expected: 169 tests pass (no regression).

- [ ] **Step 5: Commit**

```bash
git add app/app/opportunities/\[slug\]/_components/TrackingLinksManager.tsx
git commit -m "feat: open upgrade dialog when tracking link limit hit"
```

---

## Final verification

- [ ] **Start dev server and manually verify**

```bash
npm run dev
```

Check these scenarios with a FREE account:
1. Sidebar shows "Devis" with amber style + PRO badge — clicking opens upgrade modal ✅
2. Sidebar shows FREE upgrade bloc at the bottom ✅
3. `/app/quotes` shows `ProPageGate` lock screen ✅
4. `/app/agency/(config)/ai` shows `ProPageGate` lock screen ✅
5. Agency overview → "Inviter" button → opens upgrade modal (not invite dialog) ✅
6. Tracking links → create link when >10 used → opens upgrade modal ✅

- [ ] **Run lint**

```bash
npm run lint
```
Expected: no errors.
