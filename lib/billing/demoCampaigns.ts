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
