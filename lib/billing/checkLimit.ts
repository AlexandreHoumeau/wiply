import { createClient } from '@/lib/supabase/server'
import { PLANS, PlanId } from '@/lib/config/plans'

async function getAgencyPlan(agencyId: string): Promise<PlanId> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('agencies')
        .select('plan, demo_ends_at')
        .eq('id', agencyId)
        .single()

    if (!data) return 'FREE'

    if (data.demo_ends_at && new Date(data.demo_ends_at) > new Date()) {
        return 'PRO'
    }

    return (data.plan as PlanId) || 'FREE'
}

export async function checkProjectLimit(
    agencyId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = await createClient()
    const plan = await getAgencyPlan(agencyId)
    const limit = PLANS[plan].max_projects

    if (limit === Infinity) return { allowed: true }

    const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)

    if ((count ?? 0) >= limit) {
        return {
            allowed: false,
            reason: `Vous avez atteint la limite de ${limit} projet(s) sur le plan FREE. Passez au plan PRO pour créer des projets illimités.`,
        }
    }

    return { allowed: true }
}

export async function checkMemberLimit(
    agencyId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = await createClient()
    const plan = await getAgencyPlan(agencyId)
    const limit = PLANS[plan].max_members

    if (limit === Infinity) return { allowed: true }

    const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)

    if ((count ?? 0) >= limit) {
        return {
            allowed: false,
            reason: `Le plan FREE ne permet pas d'inviter des collaborateurs. Passez au plan PRO pour inviter jusqu'à 5 membres.`,
        }
    }

    return { allowed: true }
}

export async function checkTrackingLinkLimit(
    agencyId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = await createClient()
    const plan = await getAgencyPlan(agencyId)
    const limit = PLANS[plan].max_tracking_links_per_month

    if (limit === Infinity) return { allowed: true }

    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)

    const { count } = await supabase
        .from('tracking_links')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .gte('created_at', startOfMonth.toISOString())

    if ((count ?? 0) >= limit) {
        return {
            allowed: false,
            reason: `Vous avez atteint la limite de ${limit} liens trackés ce mois-ci sur le plan FREE. Passez au plan PRO pour un tracking illimité.`,
        }
    }

    return { allowed: true }
}

export async function checkAiEnabled(
    agencyId: string
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getAgencyPlan(agencyId)

    if (!PLANS[plan].ai_enabled) {
        return {
            allowed: false,
            reason: "L'IA est disponible uniquement sur le plan PRO.",
        }
    }

    return { allowed: true }
}
