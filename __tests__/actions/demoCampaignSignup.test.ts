import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/navigation — redirect throws (as Next.js does in production)
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT") }),
}))

// Mock demoCampaigns
const mockGetCampaignDemoDays = vi.fn()
const mockIncrementCampaignUses = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/billing/demoCampaigns", () => ({
  getCampaignDemoDays: mockGetCampaignDemoDays,
  incrementCampaignUses: mockIncrementCampaignUses,
}))

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock supabaseAdmin — placeholder, overridden per test
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}))

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a simple chainable Supabase mock result */
function makeChain(resolved: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnThis()
  chain.eq = vi.fn().mockReturnThis()
  chain.single = vi.fn().mockResolvedValue(resolved)
  chain.update = vi.fn().mockReturnThis()
  chain.insert = vi.fn().mockReturnThis()
  chain.delete = vi.fn().mockReturnThis()
  return chain
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("completeOnboarding — demo campaign", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } } })
  })

  it("sets demo_ends_at on the agency insert when a valid campaign code is provided", async () => {
    // Campaign returns 14 demo days
    mockGetCampaignDemoDays.mockResolvedValue(14)

    let capturedInsertPayload: any

    // Build per-call responses for supabaseAdmin.from()
    // Call order: profiles.select (guard check) → agencies.insert → profiles.insert → agencies.update
    const profileGuardChain = makeChain({ data: null, error: null }) // no existing profile

    const agencyInsertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "agency-1" }, error: null }),
    }

    const agencyInsertInterceptor = vi.fn().mockImplementation((payload: any) => {
      capturedInsertPayload = payload
      return agencyInsertChain
    })

    const agencyUpdateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const adminFromMock = vi.fn()
      .mockReturnValueOnce(profileGuardChain)                                                          // profiles.select guard
      .mockReturnValueOnce({ insert: agencyInsertInterceptor })                                       // agencies.insert
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null }) }) // profiles.insert
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(agencyUpdateChain) })                    // agencies.update owner_id

    // Patch supabaseAdmin
    const { supabaseAdmin } = await import("@/lib/supabase/admin")
    ;(supabaseAdmin as any).from = adminFromMock

    const { completeOnboarding } = await import("@/actions/onboarding.server")

    await completeOnboarding({
      agencyName: "Test Agency",
      firstName: "Alice",
      lastName: "Doe",
      campaignCode: "spring25",
    }).catch(() => {}) // redirect() throws — swallow it

    expect(mockGetCampaignDemoDays).toHaveBeenCalledWith("spring25")
    expect(capturedInsertPayload).toBeDefined()
    expect(capturedInsertPayload.demo_ends_at).toBeDefined()

    const demoEndsAt = new Date(capturedInsertPayload.demo_ends_at).getTime()
    const now = Date.now()
    const diffDays = (demoEndsAt - now) / (1000 * 3600 * 24)
    expect(diffDays).toBeGreaterThan(13)
    expect(diffDays).toBeLessThan(15)
  })

  it("does NOT set demo_ends_at on the agency insert when no campaign code is passed", async () => {
    // No campaign → null
    mockGetCampaignDemoDays.mockResolvedValue(null)

    let capturedInsertPayload: any

    const profileGuardChain = makeChain({ data: null, error: null })

    const agencyInsertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "agency-1" }, error: null }),
    }

    const agencyInsertInterceptor = vi.fn().mockImplementation((payload: any) => {
      capturedInsertPayload = payload
      return agencyInsertChain
    })

    const agencyUpdateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const adminFromMock = vi.fn()
      .mockReturnValueOnce(profileGuardChain)
      .mockReturnValueOnce({ insert: agencyInsertInterceptor })
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce({ update: vi.fn().mockReturnValue(agencyUpdateChain) })

    const { supabaseAdmin } = await import("@/lib/supabase/admin")
    ;(supabaseAdmin as any).from = adminFromMock

    const { completeOnboarding } = await import("@/actions/onboarding.server")

    await completeOnboarding({
      agencyName: "Test Agency",
      firstName: "Bob",
      lastName: "Smith",
      campaignCode: null,
    }).catch(() => {})

    expect(mockGetCampaignDemoDays).toHaveBeenCalledWith(null)
    expect(capturedInsertPayload).toBeDefined()
    expect(capturedInsertPayload.demo_ends_at).toBeUndefined()
  })
})
