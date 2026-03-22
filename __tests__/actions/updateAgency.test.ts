import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Mock Supabase admin client (prevents env var errors at import time)
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
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
