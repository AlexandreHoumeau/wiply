'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SettingsData } from '@/lib/validators/settings'

// Inner function — uses admin client (user/agency already validated outside, no cookies in cached context)
async function fetchAgencyData(agencyId: string) {
    const [
        agencyResult,
        membersResult,
        invitesResult,
        aiConfigResult,
        projectCountResult,
        memberCountResult,
    ] = await Promise.all([
        supabaseAdmin.from('agencies').select('*').eq('id', agencyId).single(),
        supabaseAdmin.from('profiles').select('id, first_name, last_name, email, role').eq('agency_id', agencyId),
        supabaseAdmin.from('agency_invites').select('id, email, role').eq('agency_id', agencyId).eq('accepted', false),
        supabaseAdmin.from('agency_ai_configs').select('*').eq('agency_id', agencyId).maybeSingle(),
        supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
    ])

    const agency = agencyResult.data
    const billing = agency ? {
        plan: (agency.plan || 'FREE') as 'FREE' | 'PRO',
        subscription_status: agency.subscription_status ?? null,
        stripe_customer_id: agency.stripe_customer_id ?? null,
        project_count: projectCountResult.count ?? 0,
        member_count: memberCountResult.count ?? 0,
    } : null

    return {
        agency,
        team: (membersResult.data || []) as SettingsData['team'],
        invites: (invitesResult.data || []) as SettingsData['invites'],
        ai: aiConfigResult.data || null,
        tracking: null,
        billing,
    }
}

export async function fetchSettingsData(): Promise<SettingsData> {
    const supabase = await createClient()

    // Auth + profile — always fresh (never cached)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Not authenticated')

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) throw new Error('Profile not found')

    if (!profile.agency_id) {
        return { profile, agency: null as any, team: [], invites: [], ai: null, tracking: null, billing: null }
    }

    // Agency data — cached per user, invalidated by mutations via revalidateTag(`settings-${user.id}`)
    const getCached = unstable_cache(
        fetchAgencyData,
        ['settings', user.id],
        { tags: [`settings-${user.id}`] }
    )

    const agencyData = await getCached(profile.agency_id)
    return { profile, ...agencyData }
}
