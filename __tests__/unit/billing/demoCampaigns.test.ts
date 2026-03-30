// __tests__/unit/billing/demoCampaigns.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRpc, mockSelect, mockEq, mockSingle, mockFrom } = vi.hoisted(() => {
    const mockRpc = vi.fn()
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockSingle = vi.fn()
    const mockFrom = vi.fn(() => ({
        select: mockSelect.mockReturnThis(),
        eq: mockEq.mockReturnThis(),
        single: mockSingle,
    }))
    return { mockRpc, mockSelect, mockEq, mockSingle, mockFrom }
})

vi.mock("@/lib/supabase/admin", () => ({
    supabaseAdmin: { from: mockFrom, rpc: mockRpc },
}))

import { getCampaignDemoDays, incrementCampaignUses } from "@/lib/billing/demoCampaigns"

beforeEach(() => {
    vi.clearAllMocks()
})

describe("getCampaignDemoDays", () => {
    it("returns demo_days for an active, non-expired campaign", async () => {
        mockSingle.mockResolvedValue({
            data: { demo_days: 14, active: true, expires_at: null, max_uses: null, uses_count: 0 },
            error: null,
        })
        const result = await getCampaignDemoDays("spring25")
        expect(result).toBe(14)
        expect(mockFrom).toHaveBeenCalledWith("demo_campaigns")
        expect(mockEq).toHaveBeenCalledWith("code", "spring25")
    })

    it("returns demo_days when uses_count is below max_uses", async () => {
        mockSingle.mockResolvedValue({
            data: { demo_days: 14, active: true, expires_at: null, max_uses: 100, uses_count: 99 },
            error: null,
        })
        const result = await getCampaignDemoDays("spring25")
        expect(result).toBe(14)
    })

    it("returns null for an inactive campaign", async () => {
        mockSingle.mockResolvedValue({
            data: { demo_days: 14, active: false, expires_at: null, max_uses: null, uses_count: 0 },
            error: null,
        })
        const result = await getCampaignDemoDays("old_camp")
        expect(result).toBeNull()
    })

    it("returns null for an expired campaign", async () => {
        mockSingle.mockResolvedValue({
            data: { demo_days: 14, active: true, expires_at: "2020-01-01T00:00:00Z", max_uses: null, uses_count: 0 },
            error: null,
        })
        const result = await getCampaignDemoDays("expired_camp")
        expect(result).toBeNull()
    })

    it("returns null when max_uses reached", async () => {
        mockSingle.mockResolvedValue({
            data: { demo_days: 14, active: true, expires_at: null, max_uses: 100, uses_count: 100 },
            error: null,
        })
        const result = await getCampaignDemoDays("full_camp")
        expect(result).toBeNull()
    })

    it("returns null when campaign code does not exist", async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } })
        const result = await getCampaignDemoDays("nonexistent")
        expect(result).toBeNull()
    })

    it("returns null for a null/undefined code", async () => {
        expect(await getCampaignDemoDays(null)).toBeNull()
        expect(await getCampaignDemoDays(undefined)).toBeNull()
        expect(mockFrom).not.toHaveBeenCalled()
    })
})

describe("incrementCampaignUses", () => {
    it("calls the increment_campaign_uses RPC with the correct argument", async () => {
        mockRpc.mockResolvedValue({ data: null, error: null })
        await incrementCampaignUses("spring25")
        expect(mockRpc).toHaveBeenCalledWith("increment_campaign_uses", { campaign_code: "spring25" })
    })
})
