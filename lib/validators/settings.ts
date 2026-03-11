import { Agency, InviteAgencyMemberInput } from "./agency"
import { AgencyAiConfig } from "./ai"
import { Profile } from "./profile"

export type SettingsData = {
    profile: Profile
    invites?: InviteAgencyMemberInput[]
    agency: Agency,
    team: Array<{
        id: string
        first_name: string
        last_name: string
        email: string
        role: string
    }>
    ai: AgencyAiConfig | null
    tracking: {
        enabled: boolean
        trackOpens: boolean
        trackClicks: boolean
        utmSource: string
        utmMedium: string
        utmCampaign: string
    } | null
    billing: {
        plan: 'FREE' | 'PRO'
        subscription_status: string | null
        stripe_customer_id: string | null
        project_count: number
        member_count: number
        tracking_link_count: number
    } | null
}
