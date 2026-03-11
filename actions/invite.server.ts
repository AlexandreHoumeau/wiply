'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { MemberJoinedEmail } from "@/emails/member-joined"
import { getPostHogClient } from "@/lib/posthog-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function acceptInvitation(token: string) {
    const supabase = await createClient()

    // 1. Récupérer l'invitation
    const { data: invite, error: inviteError } = await supabaseAdmin
        .from('agency_invites')
        .select('*, agencies(name)')
        .eq('token', token)
        .single()

    if (inviteError || !invite) {
        return { error: "Invitation introuvable ou invalide." }
    }

    // 2. Vérifier l'expiration
    if (new Date(invite.expires_at) < new Date() || invite.accepted) {
        return { error: "Cette invitation a expiré ou a déjà été utilisée." }
    }

    // 3. Vérifier l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect(`/auth/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)
    }

    if (user.email !== invite.email) {
        return { error: `Cette invitation est destinée à ${invite.email}. Vous êtes connecté en tant que ${user.email}.` }
    }

    // 4. TRANSACTION : Mettre à jour le profil + Marquer l'invitation comme acceptée
    // On utilise supabaseAdmin pour bypasser les RLS qui bloqueraient silencieusement
    // la mise à jour d'un profil avec agency_id = null (ex: membre ré-invité après suppression)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            agency_id: invite.agency_id,
            role: invite.role
        })
        .eq('id', user.id)

    if (profileError) {
        return { error: "Erreur lors de la mise à jour de votre profil." }
    }

    // Marquer l'invitation comme traitée
    await supabase
        .from('agency_invites')
        .update({ accepted: true })
        .eq('id', invite.id)

    // Fetch new member's profile for display name
    const { data: memberProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

    const memberName = memberProfile
        ? `${memberProfile.first_name} ${memberProfile.last_name}`.trim()
        : user.email ?? ''
    const agencyName = (invite as any).agencies?.name ?? 'l\'agence'
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wiply.fr'

    // Notify all agency admins (in-app + immediate email)
    const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('agency_id', invite.agency_id)
        .eq('role', 'agency_admin')

    for (const admin of admins ?? []) {
        await createNotification({
            agencyId: invite.agency_id,
            userId: admin.id,
            type: 'member_joined',
            title: 'Nouveau membre',
            body: `${memberName} a rejoint ${agencyName}`,
            metadata: { user_id: user.id },
        })

        if (admin.email) {
            sendEmail({
                to: admin.email,
                subject: `${memberName} a rejoint ${agencyName}`,
                template: MemberJoinedEmail({
                    memberName,
                    memberEmail: user.email ?? '',
                    agencyName,
                    appUrl,
                }),
            }).catch((err) => console.error("member-joined email error:", err))
        }
    }

    const posthog = getPostHogClient()
    posthog?.capture({
        distinctId: user.id,
        event: "invitation_accepted",
        properties: {
            agency_id: invite.agency_id,
            role: invite.role,
        },
    })
    await posthog?.shutdown()

    revalidatePath('/app', 'layout')
    return { success: true }
}