# Quote Legal Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all mandatory French legal fields to Wiply quotes (seller identity, client billing address, service start date, payment terms) and surface them in agency settings, the quote editor, and the public quote view.

**Architecture:** New nullable columns on `agencies`, `companies`, and `quotes` tables. Validators extended. Agency legal info stored in settings (admin-only). Client billing address added to company profile via a new server action. Quote editor extended with 3 new fields. Public quote view updated to display all legal blocks.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), Zod, TypeScript, shadcn/ui, TanStack Query v5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-quote-legal-fields-design.md`

> ⚠️ **PREREQUISITE:** Task 11 (DB migrations) must be run in the Supabase dashboard BEFORE any other task. All new columns are nullable so there is no risk — but without them, every Supabase query selecting the new fields will silently return `undefined` at runtime.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/validators/agency.ts` | Modify | Add `legalFormSchema`, extend `updateAgencySchema` + `Agency` type |
| `lib/validators/quotes.ts` | Modify | Add 3 new fields to `QuoteSchema` |
| `lib/validators/companies.ts` | Modify | Add `billing_address` to `Company` type + new `updateCompanySchema` |
| `actions/agency.server.ts` | Modify | Replace local schema with shared import, add 4 legal fields to action |
| `actions/companies.server.ts` | Modify | Add `updateCompanyBillingAddress` server action |
| `actions/quotes.server.ts` | Modify | Update `getPublicQuote` select to include all legal fields |
| `app/app/settings/agency/_components/GeneralAgencySettings.tsx` | Modify | Add "Informations légales" card |
| `app/app/companies/CompaniesPage.tsx` | Modify | Add billing address edit dialog per company |
| `app/app/quotes/[id]/components/QuoteEditor.tsx` | Modify | Add 3 new meta fields + wire into `handleSave` |
| `app/devis/[token]/page.tsx` | Modify | Add legal blocs (vendeur, client, conditions) |
| `__tests__/unit/validators/quotes.test.ts` | Modify | Add tests for new QuoteSchema fields |
| `__tests__/unit/validators/agency.test.ts` | Create | Tests for legalFormSchema + TVA validation |

---

## Task 1: Extend `QuoteSchema` with 3 new fields

**Files:**
- Modify: `lib/validators/quotes.ts`
- Modify: `__tests__/unit/validators/quotes.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/unit/validators/quotes.test.ts`:

```typescript
import { QuoteSchema } from "@/lib/validators/quotes"

describe("QuoteSchema new fields", () => {
  const baseQuote = {
    id: "00000000-0000-0000-0000-000000000001",
    agency_id: "00000000-0000-0000-0000-000000000002",
    company_id: null,
    opportunity_id: null,
    title: "Test",
    status: "draft" as const,
    token: "abc123",
    valid_until: null,
    currency: "EUR",
    discount_type: null,
    discount_value: null,
    tax_rate: null,
  }

  it("accepte service_start_date null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, service_start_date: null })
    expect(r.success).toBe(true)
  })

  it("accepte service_start_date comme string ISO", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, service_start_date: "2026-04-01" })
    expect(r.success).toBe(true)
  })

  it("accepte payment_terms_preset null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: null })
    expect(r.success).toBe(true)
  })

  it("accepte payment_terms_preset valide", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: "30_days" })
    expect(r.success).toBe(true)
  })

  it("rejette payment_terms_preset invalide", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: "invalid_value" })
    expect(r.success).toBe(false)
  })

  it("accepte payment_terms_notes null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_notes: null })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test -- --run __tests__/unit/validators/quotes.test.ts
```

Expected: FAIL — `payment_terms_preset` field not recognized in schema.

- [ ] **Step 3: Add fields to `QuoteSchema`**

In `lib/validators/quotes.ts`, add these 3 fields inside `QuoteSchema`:

```typescript
service_start_date: z.string().optional().nullable(),
payment_terms_preset: z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom']).nullable().optional(),
payment_terms_notes: z.string().optional().nullable(),
```

Also export the preset enum and labels:

```typescript
export const PaymentTermsPresetSchema = z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom'])
export type PaymentTermsPreset = z.infer<typeof PaymentTermsPresetSchema>

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  immediate: 'Comptant',
  '15_days': '15 jours',
  '30_days': '30 jours net',
  '45_days': '45 jours',
  '60_days': '60 jours fin de mois',
  custom: 'Personnalisé',
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- --run __tests__/unit/validators/quotes.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validators/quotes.ts __tests__/unit/validators/quotes.test.ts
git commit -m "feat(validators): add service_start_date, payment_terms fields to QuoteSchema"
```

---

## Task 2: Extend agency validator with legal fields

**Files:**
- Modify: `lib/validators/agency.ts`
- Create: `__tests__/unit/validators/agency.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/unit/validators/agency.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { legalFormSchema, updateAgencySchema } from "@/lib/validators/agency"

describe("legalFormSchema", () => {
  it("accepte les formes légales valides", () => {
    for (const form of ["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"]) {
      expect(legalFormSchema.safeParse(form).success).toBe(true)
    }
  })

  it("rejette une forme légale inconnue", () => {
    expect(legalFormSchema.safeParse("SCOP").success).toBe(false)
  })
})

describe("updateAgencySchema — champs légaux", () => {
  const base = {
    agency_id: "00000000-0000-0000-0000-000000000001",
    name: "Mon Agence",
  }

  it("accepte les champs légaux absents", () => {
    const r = updateAgencySchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it("accepte un vat_number au format FR valide", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "FR12345678901" })
    expect(r.success).toBe(true)
  })

  it("rejette un vat_number au mauvais format", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "12345678901" })
    expect(r.success).toBe(false)
  })

  it("accepte legal_name et rcs_number libres", () => {
    const r = updateAgencySchema.safeParse({ ...base, legal_name: "ACME SAS", rcs_number: "RCS Paris 123456789" })
    expect(r.success).toBe(true)
  })

  it("accepte vat_number vide (pour effacer le champ)", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "" })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test -- --run __tests__/unit/validators/agency.test.ts
```

Expected: FAIL — `legalFormSchema` not exported.

- [ ] **Step 3: Add legal fields to `lib/validators/agency.ts`**

Add after the existing schemas (before `createAgencySchema`):

```typescript
export const legalFormSchema = z.enum([
  'SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'Auto-entrepreneur', 'Autre'
])
```

Extend `updateAgencySchema` to include `email` (missing from the shared schema but present in the local action schema) and the 4 new legal fields:

```typescript
export const updateAgencySchema = z.object({
    agency_id: agencyIdSchema,
    name: agencyNameSchema,
    website: websiteSchema,
    phone: phoneSchema,
    address: addressSchema,
    email: emailSchema,
    // New legal fields
    legal_name: z.string().max(200).optional(),
    legal_form: legalFormSchema.optional(),
    rcs_number: z.string().max(100).optional(),
    vat_number: z.string().regex(/^FR\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, "Format invalide (ex: FR12 345 678 901)").optional().or(z.literal('')),
})
```

Note: `emailSchema` is already defined in `lib/validators/agency.ts` (line 17–21). Adding it here ensures the shared schema matches the local one and the email field is not lost during the refactor in Task 4.

Extend the `Agency` hand-written type (at the bottom of the file):

```typescript
export type Agency = {
    id: string;
    name: string;
    created_at: string | null;
    slug: string;
    owner_id: string;
    is_active: boolean;
    website: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    logo_url: string | null;
    demo_ends_at: string | null;
    plan: string | null;
    // Legal fields
    legal_name: string | null;
    legal_form: string | null;
    rcs_number: string | null;
    vat_number: string | null;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- --run __tests__/unit/validators/agency.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validators/agency.ts __tests__/unit/validators/agency.test.ts
git commit -m "feat(validators): add legalFormSchema and legal fields to updateAgencySchema + Agency type"
```

---

## Task 3: Add `billing_address` to company validator

**Files:**
- Modify: `lib/validators/companies.ts`

- [ ] **Step 1: Add `billing_address` to `Company` type**

In `lib/validators/companies.ts`, update the `Company` type:

```typescript
export type Company = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone_number: string | null;
  website: string | null;
  business_sector: string | null;
  created_at: string;
  billing_address: string | null;  // NEW
};
```

Add at the top of the file, after the existing imports (add `z` import if not present):

```typescript
import { z } from 'zod'

export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  billing_address: z.string().nullable().optional(),
})

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|companies" | head -20
```

Expected: no new TS errors on companies files.

- [ ] **Step 3: Commit**

```bash
git add lib/validators/companies.ts
git commit -m "feat(validators): add billing_address to Company type and updateCompanySchema"
```

---

## Task 4: Update agency server action to persist legal fields

**Files:**
- Modify: `actions/agency.server.ts`

- [ ] **Step 1: Replace local schema with shared import and add new fields**

In `actions/agency.server.ts`:

1. Remove the local `updateAgencySchema` definition (lines 13–19, the `z.object({...})` block).
2. Add the shared schema import. The existing line 7 imports from `@/lib/validators/agency` — add `updateAgencySchema` to that import:

```typescript
import { inviteAgencyMemberSchema, InviteAgencyMemberState, UpdateAgencyState, updateAgencySchema } from "@/lib/validators/agency"
```

3. Remove the now-unused `import { z } from "zod"` line (line 11) if it's no longer needed elsewhere in the file. Check first — if other code in the file uses `z`, keep it.

4. In the `rawData` extraction block (around line 28–35), add the 4 new fields. Do NOT include `agency_id` in `rawData` — the actual value comes from the authenticated profile, not the form. Use `.omit({ agency_id: true })` to skip validating it:

```typescript
const rawData = {
    name: formData.get("name") as string,
    website: formData.get("website") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    legal_name: formData.get("legal_name") as string || undefined,
    legal_form: formData.get("legal_form") as string || undefined,
    rcs_number: formData.get("rcs_number") as string || undefined,
    vat_number: formData.get("vat_number") as string || undefined,
}

const localSchema = updateAgencySchema.omit({ agency_id: true })
const validatedFields = localSchema.safeParse(rawData)
```

5. In the `.update({...})` call (around line 81–88), add the 4 new fields:

```typescript
.update({
    name: validatedFields.data.name,
    website: validatedFields.data.website || null,
    phone: validatedFields.data.phone || null,
    email: validatedFields.data.email || null,
    address: validatedFields.data.address || null,
    legal_name: validatedFields.data.legal_name || null,
    legal_form: validatedFields.data.legal_form || null,
    rcs_number: validatedFields.data.rcs_number || null,
    vat_number: validatedFields.data.vat_number || null,
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/agency.server.ts
git commit -m "feat(actions): persist legal fields in updateAgencyInformation"
```

---

## Task 5: Add `updateCompanyBillingAddress` server action

**Files:**
- Modify: `actions/companies.server.ts`

- [ ] **Step 1: Add the server action**

At the end of `actions/companies.server.ts`, add:

```typescript
import { updateCompanySchema } from "@/lib/validators/companies"
import { revalidatePath } from "next/cache"

export async function updateCompanyBillingAddress(id: string, billing_address: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single()

  if (!profile?.agency_id) return { error: "Agence introuvable" }

  const parsed = updateCompanySchema.safeParse({ id, billing_address })
  if (!parsed.success) return { error: "Données invalides" }

  const { error } = await supabase
    .from("companies")
    .update({ billing_address: billing_address || null })
    .eq("id", id)
    .eq("agency_id", profile.agency_id)

  if (error) return { error: error.message }

  revalidatePath("/app/companies")
  return { success: true }
}
```

Also add the `revalidatePath` import at the top if not present, and add `updateCompanySchema` to the import from validators.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/companies.server.ts
git commit -m "feat(actions): add updateCompanyBillingAddress server action"
```

---

## Task 6: Update `getPublicQuote` to fetch legal fields

**Files:**
- Modify: `actions/quotes.server.ts`

- [ ] **Step 1: Update the select string in `getPublicQuote`**

In `actions/quotes.server.ts`, find the `getPublicQuote` function (around line 75–91).

Update the select string from:
```typescript
.select("id, title, description, status, valid_until, currency, discount_type, discount_value, tax_rate, notes, created_at, company:companies(name), agency:agencies(name, logo_url, primary_color, secondary_color)")
```

To:
```typescript
.select("id, title, description, status, valid_until, currency, discount_type, discount_value, tax_rate, notes, created_at, service_start_date, payment_terms_preset, payment_terms_notes, company:companies(name, billing_address), agency:agencies(name, legal_name, legal_form, rcs_number, vat_number, address, phone, email, logo_url, primary_color, secondary_color)")
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add actions/quotes.server.ts
git commit -m "feat(actions): include legal fields and billing_address in getPublicQuote"
```

---

## Task 7: Add legal fields UI to agency settings

**Files:**
- Modify: `app/app/settings/agency/_components/GeneralAgencySettings.tsx`

- [ ] **Step 1: Add the "Informations légales" Card**

In `GeneralAgencySettings.tsx`, the existing structure is:
```tsx
<TabsContent value="general" className="space-y-6">
  <form action={agencyFormAction}>
    <Card>...</Card>  {/* "Profil de l'agence" card — line 20–86 */}
  </form>             {/* closes at line 87 */}
</TabsContent>        {/* closes at line 88 */}
```

Insert the legal card **inside the existing `<form>`**, between `</Card>` (line 86) and `</form>` (line 87). Do NOT add a new `<form>` wrapper — both cards must share the same form action so one "Enregistrer" button saves everything. The existing `<CardFooter>` submit button already handles this.

Replace the closing `</form>` on line 87 (after the first `</Card>`) with:

```tsx
    <Card className="border-border shadow-sm overflow-hidden pb-0">
      <CardHeader className="bg-card border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-lg">
            <Building className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Informations légales</CardTitle>
            <CardDescription>Mentions obligatoires apparaissant sur vos devis.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legal-name" className="text-foreground font-medium">Raison sociale</Label>
            <Input
              id="legal-name"
              name="legal_name"
              defaultValue={agency.legal_name ?? ""}
              disabled={isAgencyPending}
              placeholder="ACME SAS"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal-form" className="text-foreground font-medium">Forme juridique</Label>
            <Select name="legal_form" defaultValue={agency.legal_form ?? ""} disabled={isAgencyPending}>
              <SelectTrigger id="legal-form">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"].map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rcs-number" className="text-foreground font-medium">N° RCS / Répertoire des métiers</Label>
            <Input
              id="rcs-number"
              name="rcs_number"
              defaultValue={agency.rcs_number ?? ""}
              disabled={isAgencyPending}
              placeholder="RCS Paris 123 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vat-number" className="text-foreground font-medium">N° TVA intracommunautaire</Label>
            <Input
              id="vat-number"
              name="vat_number"
              defaultValue={agency.vat_number ?? ""}
              disabled={isAgencyPending}
              placeholder="FR00 000 000 000"
            />
            {agencyState?.errors?.vat_number && (
              <p className="text-xs text-destructive">{agencyState.errors.vat_number[0]}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </form>
```

This inserts the legal card before `</form>` so both cards are inside the same form, then closes the form. The existing `<CardFooter>` submit button at the bottom of the first card handles saving both cards' fields in a single submit.

Add `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` to the existing shadcn/ui imports at the top of the file.

Note: The `UpdateAgencyState` type will need `vat_number?: string[]` added to its `errors` type in `lib/validators/agency.ts` for the error display to typecheck.

- [ ] **Step 2: Add `vat_number` to `UpdateAgencyState` errors**

In `lib/validators/agency.ts`, update `UpdateAgencyState`:

```typescript
export type UpdateAgencyState = {
    success: boolean
    message?: string
    errors?: {
        agency_id?: string[]
        name?: string[]
        vat_number?: string[]
    }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/app/settings/agency/_components/GeneralAgencySettings.tsx lib/validators/agency.ts
git commit -m "feat(settings): add legal fields card to agency settings"
```

---

## Task 8: Add billing address edit to CompaniesPage

**Files:**
- Modify: `app/app/companies/CompaniesPage.tsx`

- [ ] **Step 1: Read CompaniesPage.tsx to understand its structure**

Read the file first: `app/app/companies/CompaniesPage.tsx`

- [ ] **Step 2: Add an edit billing address dialog**

Add a `Dialog` (shadcn/ui) with a single `Textarea` for `billing_address`. Trigger it with a small edit button on each company card/row. Use `useState` for dialog open state and a `useTransition` or direct `await` call to `updateCompanyBillingAddress`.

The minimal dialog pattern:

```tsx
"use client"
// ... existing imports ...
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { updateCompanyBillingAddress } from "@/actions/companies.server"

// Inside the component, add state:
const [billingDialog, setBillingDialog] = useState<{ open: boolean; companyId: string; current: string | null }>({
  open: false, companyId: "", current: null
})
const [billingValue, setBillingValue] = useState("")
const [isSavingBilling, setIsSavingBilling] = useState(false)

// Handler:
const handleSaveBilling = async () => {
  setIsSavingBilling(true)
  const result = await updateCompanyBillingAddress(billingDialog.companyId, billingValue || null)
  setIsSavingBilling(false)
  if ("error" in result) { toast.error(result.error); return }
  setBillingDialog({ open: false, companyId: "", current: null })
  toast.success("Adresse de facturation mise à jour")
}

// Dialog JSX (add before closing return):
<Dialog open={billingDialog.open} onOpenChange={open => setBillingDialog(s => ({ ...s, open }))}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Adresse de facturation</DialogTitle>
    </DialogHeader>
    <Textarea
      value={billingValue}
      onChange={e => setBillingValue(e.target.value)}
      placeholder="Adresse de facturation (si différente du siège social)"
      rows={3}
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => setBillingDialog(s => ({ ...s, open: false }))}>Annuler</Button>
      <Button onClick={handleSaveBilling} disabled={isSavingBilling}>
        {isSavingBilling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Enregistrer
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Add a trigger button on the company card. Look at the existing card structure and add a small button with a `MapPin` icon that opens the dialog. On open, initialize `billingValue` with the company's current `billing_address`.

- [ ] **Step 3: Update `fetchCompanies` select to include `billing_address`** *(must be done before Step 2 takes effect at runtime)*

In `actions/companies.server.ts`, add `billing_address` to the select string in `fetchCompanies`:

```typescript
.select("id, name, email, phone_number, website, business_sector, created_at, address, billing_address, opportunities(id, status, name, slug), projects(id, status, name, slug)")
```

Note: complete this step in the same commit as Step 2. The UI from Step 2 reads `company.billing_address`; without this select update, that value will be `undefined` at runtime even though it type-checks correctly (the `Company` type was updated in Task 3).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/app/companies/CompaniesPage.tsx actions/companies.server.ts
git commit -m "feat(companies): add billing address edit dialog"
```

---

## Task 9: Add 3 new fields to QuoteEditor

**Files:**
- Modify: `app/app/quotes/[id]/components/QuoteEditor.tsx`

- [ ] **Step 1: Add state and import**

At the top of `QuoteEditor.tsx`, add the import:

```typescript
import { PAYMENT_TERMS_LABELS } from "@/lib/validators/quotes"
```

Inside the `QuoteEditor` component, add state after the existing state declarations (around line 57):

```typescript
const [serviceStartDate, setServiceStartDate] = useState(quote.service_start_date ?? "")
const [paymentTermsPreset, setPaymentTermsPreset] = useState<string>(quote.payment_terms_preset ?? "")
const [paymentTermsNotes, setPaymentTermsNotes] = useState(quote.payment_terms_notes ?? "")
```

- [ ] **Step 2: Include new fields in `handleSave`**

In `handleSave` (around line 126–140), add the 3 new fields to the `updateQuote.mutateAsync` call:

```typescript
const result = await updateQuote.mutateAsync({
  title, description: description || null, notes: notes || null, valid_until: validUntil || null,
  currency,
  discount_type: discountType !== "none" ? (discountType as any) : null,
  discount_value: discountType !== "none" && discountValue ? parseFloat(discountValue) : null,
  tax_rate: taxRate ? parseFloat(taxRate) : null,
  opportunity_id: selectedOpp?.id ?? null,
  company_id: selectedOpp?.company_id ?? null,
  service_start_date: serviceStartDate || null,
  payment_terms_preset: (paymentTermsPreset || null) as any,
  payment_terms_notes: paymentTermsNotes || null,
})
```

- [ ] **Step 3: Add the 3 fields to the metadata grid**

In the meta fields section (around line 291, the `grid grid-cols-2 gap-4` div), add a new row after the existing "Valable jusqu'au" and "Devise" row:

```tsx
{/* Service start date */}
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date de début</Label>
  <Input type="date" value={serviceStartDate} onChange={e => setServiceStartDate(e.target.value)} className="h-9" />
</div>

{/* Payment terms preset */}
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modalités de paiement</Label>
  <Select value={paymentTermsPreset} onValueChange={setPaymentTermsPreset}>
    <SelectTrigger className="h-9">
      <SelectValue placeholder="Sélectionner..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">—</SelectItem>
      {Object.entries(PAYMENT_TERMS_LABELS).map(([value, label]) => (
        <SelectItem key={value} value={value}>{label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Payment terms notes - full width */}
<div className="col-span-2 space-y-1.5">
  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Précisions sur le paiement</Label>
  <Textarea
    value={paymentTermsNotes}
    onChange={e => setPaymentTermsNotes(e.target.value)}
    placeholder="Ex: 30% à la commande, solde à la livraison"
    className="text-sm resize-none"
    rows={2}
  />
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/app/quotes/[id]/components/QuoteEditor.tsx
git commit -m "feat(editor): add service_start_date and payment_terms fields to QuoteEditor"
```

---

## Task 10: Update public quote view with legal blocks

**Files:**
- Modify: `app/devis/[token]/page.tsx`

- [ ] **Step 1: Add the `PAYMENT_TERMS_LABELS` import**

At the top of `app/devis/[token]/page.tsx`, add:

```typescript
import { computeQuoteTotals, PAYMENT_TERMS_LABELS } from "@/lib/validators/quotes"
```

- [ ] **Step 2: Add vendor (agency) legal info block**

In the header section where the agency name is shown (around line 97–100), expand the agency info div to include the legal details below the name:

```tsx
<div>
  <div style={{ fontWeight: 700, fontSize: "16px", color: "#0f0f0f" }}>{agency?.name}</div>
  {agency?.legal_name && agency.legal_name !== agency.name && (
    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{agency.legal_name}</div>
  )}
  {(agency?.legal_form || agency?.rcs_number || agency?.vat_number) && (
    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
      {[agency?.legal_form, agency?.rcs_number && `RCS ${agency.rcs_number}`, agency?.vat_number && `TVA ${agency.vat_number}`].filter(Boolean).join(" · ")}
    </div>
  )}
  {(agency?.address || agency?.phone || agency?.email) && (
    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
      {[agency?.address, agency?.phone, agency?.email].filter(Boolean).join(" · ")}
    </div>
  )}
</div>
```

- [ ] **Step 3: Add client billing address**

In the client block (around line 117–130), add `billing_address` below the company name:

```tsx
<div style={{ fontSize: "17px", fontWeight: 700, color: "#0f0f0f" }}>{company.name}</div>
{company.billing_address && (
  <div style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px", whiteSpace: "pre-wrap" }}>
    {company.billing_address}
  </div>
)}
```

- [ ] **Step 4: Add conditions block (service start date + payment terms)**

After the `{/* Notes */}` block and before the `{/* Footer */}` block, add:

```tsx
{/* Conditions */}
{(quote.service_start_date || quote.payment_terms_preset || quote.payment_terms_notes) && (
  <div style={{ padding: "20px 40px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "8px" }}>
      Conditions
    </div>
    <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.8 }}>
      {quote.service_start_date && (
        <div>Début de prestation : <strong>{fmtDate(quote.service_start_date)}</strong></div>
      )}
      {quote.payment_terms_preset && (
        <div>
          Modalités de paiement : <strong>{PAYMENT_TERMS_LABELS[quote.payment_terms_preset] ?? quote.payment_terms_preset}</strong>
          {quote.payment_terms_notes && ` — ${quote.payment_terms_notes}`}
        </div>
      )}
      {!quote.payment_terms_preset && quote.payment_terms_notes && (
        <div>{quote.payment_terms_notes}</div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/devis/[token]/page.tsx
git commit -m "feat(devis): add legal blocks to public quote view (vendeur, client, conditions)"
```

---

## Task 11: DB migrations (run in Supabase dashboard)

These SQL statements must be run in the Supabase SQL editor for the project. They cannot be run via CLI automatically.

- [ ] **Step 1: Run agencies migration**

```sql
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS legal_name   TEXT,
  ADD COLUMN IF NOT EXISTS legal_form   TEXT,
  ADD COLUMN IF NOT EXISTS rcs_number   TEXT,
  ADD COLUMN IF NOT EXISTS vat_number   TEXT;
```

- [ ] **Step 2: Run companies migration**

```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS billing_address TEXT;
```

- [ ] **Step 3: Run quotes migration**

```sql
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS service_start_date  DATE,
  ADD COLUMN IF NOT EXISTS payment_terms_preset TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_notes  TEXT;
```

- [ ] **Step 4: Verify columns exist**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('agencies', 'companies', 'quotes')
  AND column_name IN ('legal_name', 'legal_form', 'rcs_number', 'vat_number', 'billing_address', 'service_start_date', 'payment_terms_preset', 'payment_terms_notes')
ORDER BY table_name, column_name;
```

Expected: 8 rows returned.

- [ ] **Step 5: Final integration test**

```bash
npm run dev
```

Manually verify:
1. Agency settings → "Profil de l'agence" tab → scroll down → "Informations légales" card is visible (admin only)
2. Fill in legal fields → save → reload → fields persisted
3. Companies page → click billing address button on a company → save an address
4. Quote editor → new fields (date de début, modalités, précisions) are visible and save correctly
5. Public quote URL → legal blocks appear in the rendered devis
