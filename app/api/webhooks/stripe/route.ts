import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
}

async function resolveAgencyId(eventObject: Stripe.Checkout.Session | Stripe.Subscription): Promise<string | null> {
    const metadataAgencyId = eventObject.metadata?.agency_id
    if (metadataAgencyId) return metadataAgencyId

    const customerId = typeof eventObject.customer === 'string' ? eventObject.customer : eventObject.customer?.id
    if (!customerId) return null

    const { data: agency } = await supabaseAdmin
        .from('agencies')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

    return agency?.id ?? null
}

async function updateAgencyBilling(
    agencyId: string,
    updates: { plan?: 'FREE' | 'PRO'; subscription_status?: string; stripe_customer_id?: string }
) {
    const { error } = await supabaseAdmin
        .from('agencies')
        .update(updates)
        .eq('id', agencyId)

    if (error) console.error('Stripe webhook agency update error:', error)
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: unknown) {
        const message = getErrorMessage(error)
        console.error('Webhook signature verification failed:', message)
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const agencyId = await resolveAgencyId(session)
                const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

                if (agencyId && customerId) {
                    await updateAgencyBilling(agencyId, {
                        plan: 'PRO',
                        stripe_customer_id: customerId,
                        subscription_status: 'active',
                    })
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const agencyId = await resolveAgencyId(subscription)

                if (agencyId) {
                    await updateAgencyBilling(agencyId, {
                        plan: subscription.status === 'active' || subscription.status === 'trialing' ? 'PRO' : undefined,
                        subscription_status: subscription.status,
                    })
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const agencyId = await resolveAgencyId(subscription)

                if (agencyId) {
                    await updateAgencyBilling(agencyId, { plan: 'FREE', subscription_status: 'inactive' })
                }
                break
            }

            default:
                // Ignorer les autres events
                break
        }
    } catch (error: unknown) {
        console.error('Webhook handler error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
