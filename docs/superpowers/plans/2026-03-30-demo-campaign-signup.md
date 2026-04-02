# Demo Campaign Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow marketing campaigns (e.g. Brevo email blasts) to use a URL like `wiply.fr/auth/signup?campaign=spring25` so that any user who signs up via that link automatically receives X days of PRO demo access.

**Architecture:** A `demo_campaigns` table maps campaign codes to a demo duration. The campaign code is captured in `SignupForm`, stored in Supabase `user_metadata` at signup, then read by `bootstrapUser()` and `completeOnboarding()` when the agency row is created — setting `demo_ends_at = now + demo_days`. Google OAuth users carry the campaign code through the OAuth redirect URL and pick it up in the callback.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + admin client), Zod, Vitest

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/20260330_demo_campaigns.sql` | Create `demo_campaigns` table |
| `lib/billing/demoCampaigns.ts` | Create — server helper to look up a campaign code and return `demo_days` |
| `services/onboarding.service.ts` | Modify — read `campaign_code` from user metadata and set `demo_ends_at` |
| `actions/onboarding.server.ts` | Modify — accept `campaignCode` param and set `demo_ends_at` |
| `actions/auth.actions.ts` | Modify — accept and store `campaignCode` in user metadata |
| `components/auth/SignupForm.tsx` | Modify — read `?campaign=` from URL, pass to `signup()` |
| `app/auth/callback/route.ts` | Modify — extract campaign code from next param and pass to `bootstrapUser()` |
| `__tests__/unit/billing/demoCampaigns.test.ts` | Create — unit tests for the lookup helper |
| `__tests__/actions/demoCampaignSignup.test.ts` | Create — integration tests for agency creation with demo |

---

## Task 1: Database migration — `demo_campaigns` table

**Files:**
- Create: `supabase/migrations/20260330_demo_campaigns.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260330_demo_campaigns.sql
create table demo_campaigns (
  code        text primary key,
  demo_days   integer not null,
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    integer,
  uses_count  integer not null default 0
);

-- Disable RLS — only accessed server-side via service role
alter table demo_campaigns enable row level security;
create policy "service role only" on demo_campaigns
  using (false);

-- Seed a first campaign
insert into demo_campaigns (code, demo_days, active)
values ('spring25', 14, true);
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
# or if using supabase CLI locally:
# npx supabase migration up
```

Expected: no errors, table `demo_campaigns` exists in your local Supabase.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260330_demo_campaigns.sql
git commit -m "feat: add demo_campaigns table migration"
```

---

## Task 2: Campaign lookup helper

**Files:**
- Create: `lib/billing/demoCampaigns.ts`
- Create: `__tests__/unit/billing/demoCampaigns.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/unit/billing/demoCampaigns.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
}))

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: mockFrom },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe("getCampaignDemoDays", () => {
  it("returns demo_days for an active, non-expired campaign", async () => {
    mockSingle.mockResolvedValue({
      data: { demo_days: 14, active: true, expires_at: null, max_uses: null, uses_count: 0 },
      error: null,
    })
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    const result = await getCampaignDemoDays("spring25")
    expect(result).toBe(14)
    expect(mockFrom).toHaveBeenCalledWith("demo_campaigns")
    expect(mockEq).toHaveBeenCalledWith("code", "spring25")
  })

  it("returns null for an inactive campaign", async () => {
    mockSingle.mockResolvedValue({
      data: { demo_days: 14, active: false, expires_at: null, max_uses: null, uses_count: 0 },
      error: null,
    })
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    const result = await getCampaignDemoDays("old_camp")
    expect(result).toBeNull()
  })

  it("returns null for an expired campaign", async () => {
    mockSingle.mockResolvedValue({
      data: { demo_days: 14, active: true, expires_at: "2020-01-01T00:00:00Z", max_uses: null, uses_count: 0 },
      error: null,
    })
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    const result = await getCampaignDemoDays("expired_camp")
    expect(result).toBeNull()
  })

  it("returns null when max_uses reached", async () => {
    mockSingle.mockResolvedValue({
      data: { demo_days: 14, active: true, expires_at: null, max_uses: 100, uses_count: 100 },
      error: null,
    })
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    const result = await getCampaignDemoDays("full_camp")
    expect(result).toBeNull()
  })

  it("returns null when campaign code does not exist", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } })
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    const result = await getCampaignDemoDays("nonexistent")
    expect(result).toBeNull()
  })

  it("returns null for a null/undefined code", async () => {
    const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
    expect(await getCampaignDemoDays(null)).toBeNull()
    expect(await getCampaignDemoDays(undefined)).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run __tests__/unit/billing/demoCampaigns.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/billing/demoCampaigns'`

- [ ] **Step 3: Implement the helper**

```ts
// lib/billing/demoCampaigns.ts
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Looks up a campaign code and returns the number of demo days it grants.
 * Returns null if the code is invalid, inactive, expired, or exhausted.
 */
export async function getCampaignDemoDays(code: string | null | undefined): Promise<number | null> {
    if (!code) return null

    const { data, error } = await supabaseAdmin
        .from("demo_campaigns")
        .select("demo_days, active, expires_at, max_uses, uses_count")
        .eq("code", code)
        .single()

    if (error || !data) return null
    if (!data.active) return null
    if (data.expires_at && new Date(data.expires_at) <= new Date()) return null
    if (data.max_uses !== null && data.uses_count >= data.max_uses) return null

    return data.demo_days
}

/**
 * Increments the uses_count for a campaign code. Fire-and-forget — failures are non-fatal.
 */
export async function incrementCampaignUses(code: string): Promise<void> {
    await supabaseAdmin.rpc("increment_campaign_uses", { campaign_code: code })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --run __tests__/unit/billing/demoCampaigns.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Add the SQL function for incrementing uses (in the migration)**

Add to the bottom of `supabase/migrations/20260330_demo_campaigns.sql`:

```sql
create or replace function increment_campaign_uses(campaign_code text)
returns void language plpgsql security definer as $$
begin
  update demo_campaigns
  set uses_count = uses_count + 1
  where code = campaign_code;
end;
$$;
```

- [ ] **Step 6: Commit**

```bash
git add lib/billing/demoCampaigns.ts __tests__/unit/billing/demoCampaigns.test.ts supabase/migrations/20260330_demo_campaigns.sql
git commit -m "feat: add campaign demo lookup helper with tests"
```

---

## Task 3: Store campaign code in user metadata at signup

**Files:**
- Modify: `actions/auth.actions.ts` (lines 10–17, 32–38)
- Modify: `components/auth/SignupForm.tsx` (lines 43, 67)

- [ ] **Step 1: Update `SignupInput` type and `signup()` in `actions/auth.actions.ts`**

Replace the `SignupInput` type and the `data` object inside `generateLink`:

```ts
// In actions/auth.actions.ts

type SignupInput = {
    email: string;
    password: string;
    agencyName?: string;
    firstName: string;
    lastName: string;
    redirectTo?: string;
    campaignCode?: string | null;   // ← add this
};
```

Inside `generateLink`, update the `data` field:

```ts
data: {
    ...(data.agencyName && { agency_name: data.agencyName }),
    first_name: data.firstName,
    last_name: data.lastName,
    ...(data.campaignCode && { campaign_code: data.campaignCode }), // ← add this
},
```

- [ ] **Step 2: Capture `?campaign=` in `SignupForm.tsx`**

After the existing `const next = searchParams.get("next");` line, add:

```tsx
const campaignCode = searchParams.get("campaign");
```

In the `onSubmit` function, update the `signup()` call:

```tsx
const result = await signup({
    ...values,
    redirectTo: next || undefined,
    campaignCode: campaignCode || undefined,   // ← add this
});
```

- [ ] **Step 3: Pass campaign code through Google OAuth redirect URL**

In `handleGoogleSignup`, update the `redirectTo`:

```tsx
const params = new URLSearchParams()
if (next) params.set("next", next)
if (campaignCode) params.set("campaign", campaignCode)
const redirectTo = `${window.location.origin}/auth/callback${params.size ? `?${params}` : ""}`

await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
})
```

- [ ] **Step 4: Run the app and verify the param is passed**

```bash
npm run dev
```

Visit `http://localhost:3000/auth/signup?campaign=spring25`, open DevTools → Network, submit the signup form, and confirm `campaign_code` appears in the Supabase user metadata (check Supabase dashboard → Authentication → Users → user metadata).

- [ ] **Step 5: Commit**

```bash
git add actions/auth.actions.ts components/auth/SignupForm.tsx
git commit -m "feat: capture campaign code in signup and store in user metadata"
```

---

## Task 4: Set `demo_ends_at` in `bootstrapUser()` (email/password flow)

**Files:**
- Modify: `services/onboarding.service.ts` (lines 52–64)
- Modify: `app/auth/callback/route.ts` (lines 32–34, 52–54)

- [ ] **Step 1: Update `bootstrapUser` signature and agency insert**

In `services/onboarding.service.ts`, update the `bootstrapUser` function. The agency insert in the "CAS A" block becomes:

```ts
import { getCampaignDemoDays, incrementCampaignUses } from "@/lib/billing/demoCampaigns"

export async function bootstrapUser(invitationToken?: string | null) {
  // ... existing code until "CAS A" block ...

  // --- CAS A : NOUVELLE AGENCE (OWNER) ---
  if (!targetAgencyId && meta?.agency_name) {
    const campaignCode = meta?.campaign_code ?? null
    const demoDays = await getCampaignDemoDays(campaignCode)
    const demoEndsAt = demoDays
      ? new Date(Date.now() + demoDays * 24 * 3600 * 1000).toISOString()
      : null

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .insert({
        name: meta.agency_name,
        slug: generateAgencySlug(meta.agency_name),
        ...(demoEndsAt && { demo_ends_at: demoEndsAt }),
      })
      .select()
      .single()

    if (agencyError) throw agencyError

    if (demoDays && campaignCode) {
      // fire-and-forget — non-fatal
      incrementCampaignUses(campaignCode).catch(console.error)
    }

    targetAgencyId = agency.id
    userRole = "agency_admin"
  }

  // ... rest of function unchanged ...
}
```

- [ ] **Step 2: Update `app/auth/callback/route.ts` to pass campaign to `bootstrapUser`**

`bootstrapUser` already reads `campaign_code` from `user_metadata` — no signature change needed. The callback doesn't need to change. Verify by re-reading the current `bootstrapUser` — it reads `const meta = user.user_metadata` and will pick up `meta.campaign_code` automatically.

✅ No changes needed to `app/auth/callback/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add services/onboarding.service.ts
git commit -m "feat: set demo_ends_at in bootstrapUser when campaign code is valid"
```

---

## Task 5: Set `demo_ends_at` in `completeOnboarding()` (Google OAuth flow)

Google OAuth users don't go through `bootstrapUser`'s agency creation — they go through `completeOnboarding()` in `actions/onboarding.server.ts` which is called from the `/onboarding` page form.

**Files:**
- Modify: `actions/onboarding.server.ts` (lines 22–25, 43–49)
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Read the onboarding page to understand how `completeOnboarding` is called**

```bash
cat /Users/alexhm/dev/la-partie-comune/app/onboarding/page.tsx
```

Look for how the form action is wired and what params it passes.

- [ ] **Step 2: Update `completeOnboarding` signature**

```ts
// actions/onboarding.server.ts
import { getCampaignDemoDays, incrementCampaignUses } from "@/lib/billing/demoCampaigns"

export async function completeOnboarding({
    agencyName,
    firstName,
    lastName,
    campaignCode,    // ← add this
}: {
    agencyName: string;
    firstName: string;
    lastName: string;
    campaignCode?: string | null;    // ← add this
}) {
    // ... existing guard checks ...

    const demoDays = await getCampaignDemoDays(campaignCode ?? null)
    const demoEndsAt = demoDays
      ? new Date(Date.now() + demoDays * 24 * 3600 * 1000).toISOString()
      : null

    const { data: agency, error: agencyError } = await supabaseAdmin
        .from("agencies")
        .insert({
            name: agencyName.trim(),
            slug,
            ...(demoEndsAt && { demo_ends_at: demoEndsAt }),
        })
        .select()
        .single()

    if (agencyError || !agency) { /* existing error handling */ }

    if (demoDays && campaignCode) {
        incrementCampaignUses(campaignCode).catch(console.error)
    }

    // ... rest of function unchanged ...
}
```

- [ ] **Step 3: Pass `campaignCode` from the onboarding page**

In `app/onboarding/page.tsx`, read the `campaign` search param from the page's `searchParams` and pass it to `completeOnboarding`. The onboarding page is a Server Component — read `searchParams.campaign`:

```tsx
// app/onboarding/page.tsx
// Add campaignCode to wherever completeOnboarding is called or to the form action:
const campaignCode = (await searchParams).campaign ?? null

// Pass to completeOnboarding action, or store in a hidden input if using a form action
```

> **Note:** Check how `completeOnboarding` is called from the onboarding page after reading the file. If it's a Server Action called directly (not via form), pass `campaignCode` as a parameter. If it's wired through a form, add a hidden `<input name="campaignCode" value={campaignCode} />`.

- [ ] **Step 4: Commit**

```bash
git add actions/onboarding.server.ts app/onboarding/page.tsx
git commit -m "feat: set demo_ends_at in completeOnboarding for Google OAuth users"
```

---

## Task 6: Integration test

**Files:**
- Create: `__tests__/actions/demoCampaignSignup.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// __tests__/actions/demoCampaignSignup.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Mock demoCampaigns helper
vi.mock("@/lib/billing/demoCampaigns", () => ({
    getCampaignDemoDays: vi.fn(),
    incrementCampaignUses: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom }
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

function buildAdminChain(results: any[]) {
    let callIndex = 0
    mockFrom.mockImplementation(() => {
        const result = results[callIndex++] ?? { data: null, error: null }
        return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(result),
        }
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
})

describe("completeOnboarding with campaign code", () => {
    it("sets demo_ends_at when campaignCode resolves to valid days", async () => {
        const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
        vi.mocked(getCampaignDemoDays).mockResolvedValue(14)

        mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } })

        const insertedAgency = { id: "ag1" }
        buildAdminChain([
            { data: null, error: null },       // existing profile check → not found
            { data: insertedAgency, error: null }, // agency insert
            { data: { id: "u1" }, error: null },   // profile insert
            { data: null, error: null },            // owner_id update
        ])

        const { completeOnboarding } = await import("@/actions/onboarding.server")

        let capturedInsertPayload: any
        mockFrom.mockImplementationOnce(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
        mockFrom.mockImplementationOnce(() => ({
            insert: vi.fn().mockImplementation((payload) => {
                capturedInsertPayload = payload
                return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: insertedAgency, error: null }) }
            }),
        }))
        mockFrom.mockImplementation(() => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: "u1" }, error: null }),
        }))

        await completeOnboarding({ agencyName: "Acme", firstName: "J", lastName: "D", campaignCode: "spring25" })
            .catch(() => {}) // redirect() throws in test env

        expect(getCampaignDemoDays).toHaveBeenCalledWith("spring25")
        expect(capturedInsertPayload?.demo_ends_at).toBeDefined()

        const demoDate = new Date(capturedInsertPayload.demo_ends_at)
        const diffDays = Math.round((demoDate.getTime() - Date.now()) / (1000 * 3600 * 24))
        expect(diffDays).toBeGreaterThanOrEqual(13)
        expect(diffDays).toBeLessThanOrEqual(14)
    })

    it("does not set demo_ends_at when campaignCode is null", async () => {
        const { getCampaignDemoDays } = await import("@/lib/billing/demoCampaigns")
        vi.mocked(getCampaignDemoDays).mockResolvedValue(null)

        mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } })

        let capturedInsertPayload: any
        mockFrom.mockImplementationOnce(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
        mockFrom.mockImplementationOnce(() => ({
            insert: vi.fn().mockImplementation((payload) => {
                capturedInsertPayload = payload
                return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "ag1" }, error: null }) }
            }),
        }))
        mockFrom.mockImplementation(() => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: "u1" }, error: null }),
        }))

        const { completeOnboarding } = await import("@/actions/onboarding.server")
        await completeOnboarding({ agencyName: "Acme", firstName: "J", lastName: "D" })
            .catch(() => {})

        expect(capturedInsertPayload?.demo_ends_at).toBeUndefined()
    })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --run __tests__/actions/demoCampaignSignup.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add __tests__/actions/demoCampaignSignup.test.ts
git commit -m "test: add integration tests for campaign demo signup"
```

---

## Task 7: Verify end-to-end locally

- [ ] **Step 1: Seed a campaign in local Supabase**

Run in Supabase SQL editor or via CLI:

```sql
insert into demo_campaigns (code, demo_days, active)
values ('testdemo', 7, true)
on conflict (code) do nothing;
```

- [ ] **Step 2: Test the full flow**

1. Visit `http://localhost:3000/auth/signup?campaign=testdemo`
2. Sign up with a new email
3. Confirm email via the link
4. Complete onboarding (if Google OAuth) or be auto-bootstrapped
5. Check Supabase → `agencies` table → the new agency should have `demo_ends_at` set to ~7 days from now
6. Check that the `DemoBanner` appears in the app (`/app` route)

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: demo campaign signup — end-to-end verified"
git push origin fix/typescript-build-errors
```

---

## Brevo Campaign URL

Once deployed, the URL to put in your Brevo email is:

```
https://wiply.fr/auth/signup?campaign=spring25
```

To create a new campaign with different duration:
```sql
insert into demo_campaigns (code, demo_days, active)
values ('your_code_here', 14, true);
```
