import { supabaseAdmin } from "@/lib/supabase/admin"

interface DemoCampaignRow {
    demo_days: number
    active: boolean
    expires_at: string | null
    max_uses: number | null
    uses_count: number
}

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

    const row = data as unknown as DemoCampaignRow

    if (!row.active) return null
    // expires_at is exclusive: treat "now" as already expired
    if (row.expires_at && new Date(row.expires_at) <= new Date()) return null
    if (row.max_uses !== null && row.uses_count >= row.max_uses) return null

    return row.demo_days
}

/**
 * Increments the uses_count for a campaign code. Fire-and-forget — failures are non-fatal.
 */
export async function incrementCampaignUses(code: string): Promise<void> {
    await supabaseAdmin.rpc("increment_campaign_uses", { campaign_code: code })
}
