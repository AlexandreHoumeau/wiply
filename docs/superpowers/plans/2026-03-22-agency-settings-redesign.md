# Agency Settings UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the agency settings page into per-section cards with independent Save/Cancel, a live completion indicator for legal fields, and inline feedback per card.

**Architecture:** Split the existing single form into two independent `<form>` elements, each with its own server action and `useActionState`. Controlled components enable live banner/badge toggle and Cancel without native form reset. `AgencyInfoCard` on the agency dashboard is migrated to the new profile action.

**Tech Stack:** Next.js App Router, Server Actions + `useActionState`, Zod, Supabase, shadcn/ui (Card, Input, Select, Label, Button), Tailwind CSS 4, Vitest for action tests.

**Spec:** `docs/superpowers/specs/2026-03-22-agency-settings-redesign.md`

---

## File Map

| File | Change |
|---|---|
| `lib/validators/agency.ts` | Add 2 schemas + 2 state types |
| `actions/agency.server.ts` | Add `updateAgencyProfile`, `updateAgencyLegal`; remove `updateAgencyInformation` |
| `__tests__/actions/updateAgency.test.ts` | New — tests for both new actions |
| `app/app/settings/agency/page.tsx` | Replace single `useActionState` with two; update props; remove global Alerts |
| `app/app/settings/agency/_components/GeneralAgencySettings.tsx` | Full rewrite — controlled, two forms, banner, badge, inline feedback |
| `app/app/agency/_components/AgencyInfoCard.tsx` | Swap import from `updateAgencyInformation` → `updateAgencyProfile` |

---

## Task 1: Add schemas and state types to validators

**Files:**
- Modify: `lib/validators/agency.ts`

- [ ] **Step 1: Add `updateAgencyProfileSchema` after the existing `updateAgencySchema`**

In `lib/validators/agency.ts`, after line 95 (end of `UpdateAgencyState`), add:

```ts
export const updateAgencyProfileSchema = z.object({
  name: agencyNameSchema,
  website: websiteSchema,
  // emailSchema already has .optional() baked in — don't wrap it again.
  // Use an explicit schema that accepts "" as blank.
  email: z.string().email("Email invalide").toLowerCase().or(z.literal("")).optional(),
  phone: phoneSchema,
  address: addressSchema,
})

export type UpdateAgencyProfileState = {
  success: boolean
  message?: string
  errors?: {
    name?: string[]
    website?: string[]
    email?: string[]
    phone?: string[]
    address?: string[]
  }
} | null
```

- [ ] **Step 2: Add `updateAgencyLegalSchema` immediately after**

```ts
export const updateAgencyLegalSchema = z.object({
  legal_name: z.string().max(200).optional().or(z.literal("")),
  legal_form: legalFormSchema.optional(),
  rcs_number: z.string().max(100).optional().or(z.literal("")),
  vat_number: z.string()
    .regex(/^FR\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, "Format invalide (ex: FR12 345 678 901)")
    .optional()
    .or(z.literal("")),
})

export type UpdateAgencyLegalState = {
  success: boolean
  message?: string
  errors?: {
    legal_name?: string[]
    legal_form?: string[]
    rcs_number?: string[]
    vat_number?: string[]
  }
} | null
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new types.

---

## Task 2: Add new server actions (TDD)

**Files:**
- Modify: `actions/agency.server.ts`
- Create: `__tests__/actions/updateAgency.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/updateAgency.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Mock Supabase server client
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockAuth = { getUser: mockGetUser }
const mockSupabase = { auth: mockAuth, from: mockFrom }

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Helpers to build chain
function buildChain(result: any) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("updateAgencyProfile", () => {
  it("returns error when not authenticated", async () => {
    const { updateAgencyProfile } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not auth") })
    const fd = new FormData()
    fd.set("name", "Test")
    const result = await updateAgencyProfile(null, fd)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/authentifié/i)
  })

  it("returns field errors when name is too short", async () => {
    const { updateAgencyProfile } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    buildChain({ data: { agency_id: "a1", role: "agency_admin" }, error: null })
    const fd = new FormData()
    fd.set("name", "X") // too short
    const result = await updateAgencyProfile(null, fd)
    expect(result.success).toBe(false)
    expect(result.errors?.name).toBeDefined()
  })

  it("returns success when valid data is provided", async () => {
    const { updateAgencyProfile } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    const chain = buildChain({ data: { agency_id: "a1", role: "agency_admin" }, error: null })
    chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const fd = new FormData()
    fd.set("name", "Wiply Studio")
    fd.set("email", "hello@wiply.fr")
    const result = await updateAgencyProfile(null, fd)
    expect(result.success).toBe(true)
  })
})

describe("updateAgencyLegal", () => {
  it("returns error when user is not agency_admin", async () => {
    const { updateAgencyLegal } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    buildChain({ data: { agency_id: "a1", role: "agency_member" }, error: null })
    const fd = new FormData()
    fd.set("legal_name", "Wiply SAS")
    const result = await updateAgencyLegal(null, fd)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/permissions/i)
  })

  it("returns field error when vat_number format is invalid", async () => {
    const { updateAgencyLegal } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    buildChain({ data: { agency_id: "a1", role: "agency_admin" }, error: null })
    const fd = new FormData()
    fd.set("vat_number", "INVALID")
    const result = await updateAgencyLegal(null, fd)
    expect(result.success).toBe(false)
    expect(result.errors?.vat_number).toBeDefined()
  })

  it("returns success when all optional fields are empty strings", async () => {
    const { updateAgencyLegal } = await import("@/actions/agency.server")
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    const chain = buildChain({ data: { agency_id: "a1", role: "agency_admin" }, error: null })
    chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const fd = new FormData()
    // All empty — should be valid (all optional)
    const result = await updateAgencyLegal(null, fd)
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run __tests__/actions/updateAgency.test.ts
```

Expected: FAIL — `updateAgencyProfile` and `updateAgencyLegal` are not exported yet.

- [ ] **Step 3: Add `updateAgencyProfile` to `actions/agency.server.ts`**

Add after line 117 (after `updateAgencyInformation`), importing `updateAgencyProfileSchema` and `UpdateAgencyProfileState` from validators:

```ts
export async function updateAgencyProfile(
  prevState: UpdateAgencyProfileState,
  formData: FormData
): Promise<UpdateAgencyProfileState> {
  try {
    const rawData = {
      name: formData.get("name") as string,
      website: formData.get("website") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    }

    const validated = updateAgencyProfileSchema.safeParse(rawData)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
        message: "Veuillez corriger les erreurs",
      }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, message: "Non authentifié" }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.agency_id) return { success: false, message: "Aucune agence associée" }
    if (profile.role !== "agency_admin") return { success: false, message: "Permissions insuffisantes" }

    const { error: updateError } = await supabase
      .from("agencies")
      .update({
        name: validated.data.name,
        website: validated.data.website || null,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
      })
      .eq("id", profile.agency_id)

    if (updateError) return { success: false, message: "Erreur lors de la mise à jour" }

    revalidateTag(`settings-${user.id}`)
    revalidatePath("/app/settings/agency")

    return { success: true, message: "Profil mis à jour" }
  } catch {
    return { success: false, message: "Une erreur inattendue s'est produite" }
  }
}
```

- [ ] **Step 4: Add `updateAgencyLegal` immediately after**

```ts
export async function updateAgencyLegal(
  prevState: UpdateAgencyLegalState,
  formData: FormData
): Promise<UpdateAgencyLegalState> {
  try {
    const rawData = {
      legal_name: formData.get("legal_name") as string || undefined,
      legal_form: formData.get("legal_form") as string || undefined,
      rcs_number: formData.get("rcs_number") as string || undefined,
      vat_number: formData.get("vat_number") as string || undefined,
    }

    const validated = updateAgencyLegalSchema.safeParse(rawData)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
        message: "Veuillez corriger les erreurs",
      }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, message: "Non authentifié" }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.agency_id) return { success: false, message: "Aucune agence associée" }
    if (profile.role !== "agency_admin") return { success: false, message: "Permissions insuffisantes" }

    const { error: updateError } = await supabase
      .from("agencies")
      .update({
        legal_name: validated.data.legal_name || null,
        legal_form: validated.data.legal_form || null,
        rcs_number: validated.data.rcs_number || null,
        vat_number: validated.data.vat_number || null,
      })
      .eq("id", profile.agency_id)

    if (updateError) return { success: false, message: "Erreur lors de la mise à jour" }

    revalidateTag(`settings-${user.id}`)
    revalidatePath("/app/settings/agency")

    return { success: true, message: "Mentions légales mises à jour" }
  } catch {
    return { success: false, message: "Une erreur inattendue s'est produite" }
  }
}
```

Add the new imports at the top of `actions/agency.server.ts` (update the existing import from `@/lib/validators/agency`):

```ts
import {
  inviteAgencyMemberSchema,
  InviteAgencyMemberState,
  UpdateAgencyState,
  updateAgencySchema,
  updateAgencyProfileSchema,
  UpdateAgencyProfileState,
  updateAgencyLegalSchema,
  UpdateAgencyLegalState,
} from "@/lib/validators/agency"
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --run __tests__/actions/updateAgency.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/validators/agency.ts actions/agency.server.ts __tests__/actions/updateAgency.test.ts
git commit -m "feat(settings): add updateAgencyProfile and updateAgencyLegal server actions"
```

---

## Task 3: Migrate AgencyInfoCard to new action

**Files:**
- Modify: `app/app/agency/_components/AgencyInfoCard.tsx`

This must happen before removing `updateAgencyInformation`, because `AgencyInfoCard` imports it.

- [ ] **Step 1: Update the import in `AgencyInfoCard.tsx`**

Change line 3 from:
```ts
import { updateAgencyInformation } from "@/actions/agency.server";
```
to:
```ts
import { updateAgencyProfile } from "@/actions/agency.server";
```

- [ ] **Step 2: Update the `useActionState` call on line 27**

Change:
```ts
const [state, formAction, isPending] = useActionState(updateAgencyInformation, null);
```
to:
```ts
const [state, formAction, isPending] = useActionState(updateAgencyProfile, null);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/app/agency/_components/AgencyInfoCard.tsx
git commit -m "feat(agency): migrate AgencyInfoCard to updateAgencyProfile action"
```

---

## Task 4: Remove `updateAgencyInformation`

**Files:**
- Modify: `actions/agency.server.ts`
- Modify: `lib/validators/agency.ts` (remove `UpdateAgencyState` if unused, or keep for safety)

- [ ] **Step 1: Check for any remaining consumers**

```bash
grep -r "updateAgencyInformation" app/ --include="*.tsx" --include="*.ts"
```

Expected: no results (AgencyInfoCard was already migrated in Task 3; settings page import will be updated in Task 5). If any results appear, migrate those consumers first before proceeding.

- [ ] **Step 2: Remove `updateAgencyInformation` from `actions/agency.server.ts`**

Delete the entire `updateAgencyInformation` function — search for `export async function updateAgencyInformation(` and delete from that line through to its closing `}`. Do **not** rely on line numbers here; Task 2 added ~240 lines above this point and the line numbers in the original file are now stale.

Also remove `updateAgencySchema` and `UpdateAgencyState` from the import at the top of the file if they are no longer referenced anywhere in `actions/agency.server.ts`.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add actions/agency.server.ts
git commit -m "refactor(agency): remove updateAgencyInformation, replaced by split actions"
```

---

## Task 5: Rewrite GeneralAgencySettings component

**Files:**
- Modify: `app/app/settings/agency/_components/GeneralAgencySettings.tsx`

This is a complete rewrite. The component becomes `"use client"`, fully controlled, with two forms and two sets of actions.

- [ ] **Step 1: Replace the entire file content**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { Agency, UpdateAgencyProfileState, UpdateAgencyLegalState } from "@/lib/validators/agency"

const LEGAL_FORM_OPTIONS = ["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"] as const

type Props = {
  agency: Agency
  profileFormAction: (payload: FormData) => void
  isProfilePending: boolean
  profileState: UpdateAgencyProfileState
  legalFormAction: (payload: FormData) => void
  isLegalPending: boolean
  legalState: UpdateAgencyLegalState
}

export default function GeneralAgencySettings({
  agency,
  profileFormAction,
  isProfilePending,
  profileState,
  legalFormAction,
  isLegalPending,
  legalState,
}: Props) {
  const router = useRouter()

  // Profile card — controlled state
  const [name, setName] = useState(agency.name)
  const [website, setWebsite] = useState(agency.website ?? "")
  const [email, setEmail] = useState(agency.email ?? "")
  const [phone, setPhone] = useState(agency.phone ?? "")
  const [address, setAddress] = useState(agency.address ?? "")

  // Legal card — controlled state
  const [legalName, setLegalName] = useState(agency.legal_name ?? "")
  const [legalForm, setLegalForm] = useState(agency.legal_form ?? "")
  const [rcsNumber, setRcsNumber] = useState(agency.rcs_number ?? "")
  const [vatNumber, setVatNumber] = useState(agency.vat_number ?? "")

  const isLegalComplete = [legalName, legalForm, rcsNumber, vatNumber].every(Boolean)

  // Refresh context after successful saves so SettingsProvider re-hydrates
  useEffect(() => {
    if (profileState?.success) router.refresh()
  }, [profileState, router])

  useEffect(() => {
    if (legalState?.success) router.refresh()
  }, [legalState, router])

  function resetProfile() {
    setName(agency.name)
    setWebsite(agency.website ?? "")
    setEmail(agency.email ?? "")
    setPhone(agency.phone ?? "")
    setAddress(agency.address ?? "")
  }

  function resetLegal() {
    setLegalName(agency.legal_name ?? "")
    setLegalForm(agency.legal_form ?? "")
    setRcsNumber(agency.rcs_number ?? "")
    setVatNumber(agency.vat_number ?? "")
  }

  return (
    <TabsContent value="general" className="space-y-6">

      {/* Card 1: Profile */}
      <form action={profileFormAction}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Profil de l'agence</CardTitle>
            <CardDescription>Votre identité commerciale et coordonnées de contact.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Name — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom commercial <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.name && (
                <p className="text-xs text-destructive">{profileState.errors.name[0]}</p>
              )}
            </div>

            {/* Website — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="website">Site internet</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={e => setWebsite(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.website && (
                <p className="text-xs text-destructive">{profileState.errors.website[0]}</p>
              )}
            </div>

            {/* Email + Phone — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email de contact</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isProfilePending}
                />
                {profileState?.errors?.email && (
                  <p className="text-xs text-destructive">{profileState.errors.email[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={isProfilePending}
                />
                {profileState?.errors?.phone && (
                  <p className="text-xs text-destructive">{profileState.errors.phone[0]}</p>
                )}
              </div>
            </div>

            {/* Address — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse du siège</Label>
              <Input
                id="address"
                name="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.address && (
                <p className="text-xs text-destructive">{profileState.errors.address[0]}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t border-border flex items-center justify-between gap-3 py-4">
            {/* Inline feedback */}
            <div className="text-sm">
              {profileState?.success && <span className="text-emerald-600 font-medium">✓ Enregistré</span>}
              {profileState?.success === false && profileState.message && (
                <span className="text-destructive">{profileState.message}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetProfile} disabled={isProfilePending}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isProfilePending}>
                {isProfilePending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Card 2: Legal */}
      <form action={legalFormAction}>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">Mentions légales</CardTitle>
                <CardDescription>Informations requises sur vos devis en droit français.</CardDescription>
              </div>
              {isLegalComplete && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 shrink-0">
                  ✓ Complet
                </span>
              )}
            </div>
          </CardHeader>

          {/* Amber banner — shown when any legal field is missing */}
          {!isLegalComplete && (
            <div className="border-y border-amber-200 bg-amber-50 px-6 py-3 flex items-start gap-3">
              <span className="text-sm mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Ces informations sont absentes de vos devis</p>
                <p className="text-sm text-amber-700 mt-0.5">Renseignez-les pour être conforme aux obligations légales françaises.</p>
              </div>
            </div>
          )}

          <CardContent className="space-y-4 pt-4">
            {/* legal_name + legal_form — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="legal_name">Raison sociale</Label>
                <Input
                  id="legal_name"
                  name="legal_name"
                  placeholder="Ex : Wiply SAS"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  disabled={isLegalPending}
                />
                <p className="text-xs text-muted-foreground">Si différente du nom commercial</p>
                {legalState?.errors?.legal_name && (
                  <p className="text-xs text-destructive">{legalState.errors.legal_name[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legal_form">Forme juridique</Label>
                <Select
                  name="legal_form"
                  value={legalForm}
                  onValueChange={setLegalForm}
                  disabled={isLegalPending}
                >
                  <SelectTrigger id="legal_form">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORM_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {legalState?.errors?.legal_form && (
                  <p className="text-xs text-destructive">{legalState.errors.legal_form[0]}</p>
                )}
              </div>
            </div>

            {/* rcs_number + vat_number — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rcs_number">N° RCS / Répertoire des métiers</Label>
                <Input
                  id="rcs_number"
                  name="rcs_number"
                  placeholder="Ex : Paris B 123 456 789"
                  value={rcsNumber}
                  onChange={e => setRcsNumber(e.target.value)}
                  disabled={isLegalPending}
                />
                {legalState?.errors?.rcs_number && (
                  <p className="text-xs text-destructive">{legalState.errors.rcs_number[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat_number">N° TVA intracommunautaire</Label>
                <Input
                  id="vat_number"
                  name="vat_number"
                  placeholder="Ex : FR12 345 678 901"
                  value={vatNumber}
                  onChange={e => setVatNumber(e.target.value)}
                  disabled={isLegalPending}
                />
                {legalState?.errors?.vat_number && (
                  <p className="text-xs text-destructive">{legalState.errors.vat_number[0]}</p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border flex items-center justify-between gap-3 py-4">
            {/* Inline feedback */}
            <div className="text-sm">
              {legalState?.success && <span className="text-emerald-600 font-medium">✓ Enregistré</span>}
              {legalState?.success === false && legalState.message && (
                <span className="text-destructive">{legalState.message}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetLegal} disabled={isLegalPending}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isLegalPending}>
                {isLegalPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

    </TabsContent>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/settings/agency/_components/GeneralAgencySettings.tsx
git commit -m "feat(settings): rewrite GeneralAgencySettings — two cards, banner, badge, inline feedback"
```

---

## Task 6: Update the settings page

**Files:**
- Modify: `app/app/settings/agency/page.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
"use client"

import { updateAgencyProfile, updateAgencyLegal } from "@/actions/agency.server"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useActionState, useEffect, useState } from "react"
import { useSettings } from "../settings-context"
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider"
import GeneralAgencySettings from "./_components/GeneralAgencySettings"
import TeamMemberSettings from "./_components/TeamMemberSettings"
import { inviteTeamMember } from "@/actions/agency.server"

export default function AgencyPage() {
  const { agency, team, invites = [], profile, billing } = useSettings()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const { openUpgradeDialog } = useUpgradeDialog()

  function handleInviteClick() {
    if (billing?.plan !== "PRO") {
      openUpgradeDialog("Le plan FREE ne permet pas d'inviter des collaborateurs.", agency.id)
    } else {
      setInviteDialogOpen(true)
    }
  }

  const [profileState, profileFormAction, isProfilePending] = useActionState(updateAgencyProfile, null)
  const [legalState, legalFormAction, isLegalPending] = useActionState(updateAgencyLegal, null)
  const [inviteState, inviteFormAction, isInvitePending] = useActionState(inviteTeamMember, null)

  useEffect(() => {
    if (inviteState?.success && inviteDialogOpen) {
      const timer = setTimeout(() => setInviteDialogOpen(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [inviteState, inviteDialogOpen])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8">
          <TabsTrigger value="general" className="data-[state=active]:shadow-sm">Général</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:shadow-sm">
            Équipe ({team.length})
          </TabsTrigger>
        </TabsList>
        <GeneralAgencySettings
          agency={agency}
          profileFormAction={profileFormAction}
          isProfilePending={isProfilePending}
          profileState={profileState}
          legalFormAction={legalFormAction}
          isLegalPending={isLegalPending}
          legalState={legalState}
        />
        <TeamMemberSettings
          team={team}
          invites={invites}
          profile={profile}
          inviteState={inviteState}
          inviteFormAction={inviteFormAction}
          isInvitePending={isInvitePending}
          inviteDialogOpen={inviteDialogOpen}
          setInviteDialogOpen={setInviteDialogOpen}
          onInviteClick={handleInviteClick}
        />
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/app/settings/agency/page.tsx
git commit -m "feat(settings): update agency page — two useActionState, remove global alerts"
```

---

## Task 7: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to `/app/settings/agency`**

Verify:
- Two separate cards are rendered
- "Mentions légales" card shows the amber banner when fields are empty
- Filling all 4 legal fields makes the banner disappear and the "✓ Complet" badge appear
- Saving each card shows the inline "✓ Enregistré" feedback
- Cancel resets the form to original values
- The `legal_form` Select resets correctly via Cancel

- [ ] **Step 3: Navigate to `/app/agency` (agency dashboard)**

Verify the `AgencyInfoCard` still works — click Edit, change a field, save → success toast appears.

- [ ] **Step 4: Open a quote in the editor and test the agency warning dialog**

If agency fields are still empty, clicking "Lien" or "Voir" should still show the warning dialog (this is unaffected by the refactor — it reads from `useAgency()` context).
