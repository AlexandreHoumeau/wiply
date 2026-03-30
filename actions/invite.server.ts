'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { checkMemberLimit } from "@/lib/billing/checkLimit"
import { enforceAgencySeatPolicy } from "@/lib/billing/enforceSeatPolicy"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { MemberJoinedEmail } from "@/emails/member-joined"
import { getPostHogClient } from "@/lib/posthog-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type InviteWithAgency = {
    id: string
    agency_id: string
    role: string
    email: string
    accepted: boolean
    expires_at: string
    agencies: {
        name: string | null
    } | null
}

export async function acceptInvitation(token: string) {
    const supabase = await createClient()

    // 1. Récupérer l'invitation
    const { data: invite, error: inviteError } = await supabaseAdmin
        .from('agency_invites')
        .select('*, agencies(name)')
        .eq('token', token)
        .single()

    const typedInvite = invite as InviteWithAgency | null

    if (inviteError || !typedInvite) {
        return { error: "Invitation introuvable ou invalide." }
    }

    // 2. Vérifier l'expiration
    if (new Date(typedInvite.expires_at) < new Date() || typedInvite.accepted) {
        return { error: "Cette invitation a expiré ou a déjà été utilisée." }
    }

    // 3. Vérifier l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect(`/auth/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)
    }

    if (user.email !== typedInvite.email) {
        return { error: `Cette invitation est destinée à ${typedInvite.email}. Vous êtes connecté en tant que ${user.email}.` }
    }

    await enforceAgencySeatPolicy(typedInvite.agency_id)

    const limitCheck = await checkMemberLimit(typedInvite.agency_id)
    if (!limitCheck.allowed) {
        await supabaseAdmin
            .from("agency_invites")
            .delete()
            .eq("id", typedInvite.id);

        return { error: "Cette invitation n'est plus valide car l'agence n'a plus de places disponibles sur son plan actuel." }
    }

    // 4. TRANSACTION : Mettre à jour le profil + Marquer l'invitation comme acceptée
    // On utilise supabaseAdmin pour bypasser les RLS qui bloqueraient silencieusement
    // la mise à jour d'un profil avec agency_id = null (ex: membre ré-invité après suppression)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            agency_id: typedInvite.agency_id,
            role: typedInvite.role
        })
        .eq('id', user.id)

    if (profileError) {
        return { error: "Erreur lors de la mise à jour de votre profil." }
    }

    // Marquer l'invitation comme traitée
    await supabase
        .from('agency_invites')
        .update({ accepted: true })
        .eq('id', typedInvite.id)

    // Fetch new member's profile for display name
    const { data: memberProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

    const memberName = memberProfile
        ? `${memberProfile.first_name} ${memberProfile.last_name}`.trim()
        : user.email ?? ''
    const agencyName = typedInvite.agencies?.name ?? 'l\'agence'
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wiply.fr'

    // Notify all agency admins (in-app + immediate email)
    const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('agency_id', typedInvite.agency_id)
        .eq('role', 'agency_admin')

    for (const admin of admins ?? []) {
        await createNotification({
            agencyId: typedInvite.agency_id,
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
            agency_id: typedInvite.agency_id,
            role: typedInvite.role,
        },
    })
    await posthog?.shutdown()

    revalidatePath('/app', 'layout')
    return { success: true }
}
