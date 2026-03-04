'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createNotification } from "@/lib/notifications"
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

    // Notify all agency admins
    const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('agency_id', invite.agency_id)
        .eq('role', 'agency_admin')

    for (const admin of admins ?? []) {
        await createNotification({
            agencyId: invite.agency_id,
            userId: admin.id,
            type: 'member_joined',
            title: 'Nouveau membre',
            body: `${user.email} a rejoint ${(invite as any).agencies?.name ?? 'l\'agence'}`,
            metadata: { user_id: user.id },
        })
    }

    revalidatePath('/app', 'layout')
    return { success: true }
}