'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLANS } from '@/lib/config/plans'

async function getAuthorizedAgencyBillingContext(agencyId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' as const }

    const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.agency_id || profile.agency_id !== agencyId) {
        return { error: 'Accès non autorisé' as const }
    }

    if (profile.role !== 'agency_admin') {
        return { error: 'Seul un administrateur peut gérer la facturation.' as const }
    }

    return { supabase, user }
}

async function getBaseUrl(): Promise<string> {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL
    }
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    return `${proto}://${host}`
}

export async function createCheckoutSession(
    agencyId: string
): Promise<{ url: string } | { error: string }> {
    const context = await getAuthorizedAgencyBillingContext(agencyId)
    if ('error' in context) return { error: context.error as string }
    const { supabase, user } = context

    const { data: agency } = await supabase
        .from('agencies')
        .select('stripe_customer_id, plan')
        .eq('id', agencyId)
        .single()

    if (!agency) return { error: 'Agence introuvable' }
    if (agency.plan === 'PRO') return { error: 'Votre agence est déjà sur le plan PRO.' }

    const baseUrl = await getBaseUrl()
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        // Si un customer Stripe existe déjà, on l'utilise (email pré-rempli automatiquement)
        // Sinon on passe l'email du compte connecté pour pré-remplir le champ
        ...(agency.stripe_customer_id
            ? { customer: agency.stripe_customer_id }
            : { customer_email: user.email }),
        line_items: [{ price: PLANS.PRO.price_id, quantity: 1 }],
        success_url: `${baseUrl}/app/agency/billing?success=true`,
        cancel_url: `${baseUrl}/app/agency/billing`,
        metadata: { agency_id: agencyId },
        subscription_data: { metadata: { agency_id: agencyId } },
    })

    return { url: session.url! }
}

export async function createPortalSession(
    agencyId: string
): Promise<{ url: string } | { error: string }> {
    const context = await getAuthorizedAgencyBillingContext(agencyId)
    if ('error' in context) return { error: context.error as string }
    const { supabase } = context

    const { data: agency } = await supabase
        .from('agencies')
        .select('stripe_customer_id')
        .eq('id', agencyId)
        .single()

    if (!agency?.stripe_customer_id) return { error: 'Aucun abonnement actif trouvé.' }

    const baseUrl = await getBaseUrl()
    const session = await stripe.billingPortal.sessions.create({
        customer: agency.stripe_customer_id,
        return_url: `${baseUrl}/app/agency/billing`,
    })

    return { url: session.url }
}
