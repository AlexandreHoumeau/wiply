export const PLANS = {
    FREE: {
        max_projects: 2,
        max_members: 1, // owner only — no invitations allowed
        max_tracking_links_per_month: 10,
        ai_enabled: false,
        price_id: null as null,
    },
    PRO: {
        max_projects: Infinity,
        max_members: 6, // owner + 5 collaborators
        max_tracking_links_per_month: Infinity,
        ai_enabled: true,
        price_id: process.env.STRIPE_PRO_PRICE_ID!,
    },
} as const

export type PlanId = keyof typeof PLANS
