'use server'

import { InviteEmail } from '@/emails/agency-invite';
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkMemberLimit } from "@/lib/billing/checkLimit"
import { inviteAgencyMemberSchema, InviteAgencyMemberState, updateAgencyProfileSchema, UpdateAgencyProfileState, updateAgencyLegalSchema, UpdateAgencyLegalState } from "@/lib/validators/agency"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"


export async function updateAgencyProfile(
  prevState: UpdateAgencyProfileState,
  formData: FormData
): Promise<UpdateAgencyProfileState> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, message: "Non authentifié" }

    const rawData = {
      name: formData.get("name") as string,
      website: formData.get("website") ?? undefined,
      email: formData.get("email") ?? undefined,
      phone: formData.get("phone") ?? undefined,
      address: formData.get("address") ?? undefined,
    }

    const validated = updateAgencyProfileSchema.safeParse(rawData)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
        message: "Veuillez corriger les erreurs",
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.agency_id) return { success: false, message: "Aucune agence associée" }
    if (profile.role !== "agency_admin") return { success: false, message: "Permissions insuffisantes" }

    const { error: updateError } = await supabase
      .from("agencies")
      .update({
        name: validated.data.name,
        website: validated.data.website || null,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
      })
      .eq("id", profile.agency_id)

    if (updateError) return { success: false, message: "Erreur lors de la mise à jour" }

    revalidateTag(`settings-${user.id}`)
    revalidatePath("/app/settings/agency")

    return { success: true, message: "Profil mis à jour" }
  } catch {
    return { success: false, message: "Une erreur inattendue s'est produite" }
  }
}

export async function updateAgencyLegal(
  prevState: UpdateAgencyLegalState,
  formData: FormData
): Promise<UpdateAgencyLegalState> {
  try {
    const rawData = {
      legal_name: formData.get("legal_name") as string || undefined,
      legal_form: formData.get("legal_form") as string || undefined,
      rcs_number: formData.get("rcs_number") as string || undefined,
      vat_number: formData.get("vat_number") as string || undefined,
    }

    const validated = updateAgencyLegalSchema.safeParse(rawData)
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
        message: "Veuillez corriger les erreurs",
      }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, message: "Non authentifié" }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.agency_id) return { success: false, message: "Aucune agence associée" }
    if (profile.role !== "agency_admin") return { success: false, message: "Permissions insuffisantes" }

    const { error: updateError } = await supabase
      .from("agencies")
      .update({
        legal_name: validated.data.legal_name || null,
        legal_form: validated.data.legal_form || null,
        rcs_number: validated.data.rcs_number || null,
        vat_number: validated.data.vat_number || null,
      })
      .eq("id", profile.agency_id)

    if (updateError) return { success: false, message: "Erreur lors de la mise à jour" }

    revalidateTag(`settings-${user.id}`)
    revalidatePath("/app/settings/agency")

    return { success: true, message: "Mentions légales mises à jour" }
  } catch {
    return { success: false, message: "Une erreur inattendue s'est produite" }
  }
}

export async function inviteTeamMember(
    prevState: InviteAgencyMemberState | null,
    formData: FormData
): Promise<InviteAgencyMemberState> {
    try {
        // 1. Extract form data
        const rawData = {
            email: formData.get("email") as string,
            role: formData.get("role") as string,
        }

        // 2. Validate
        const validatedFields = inviteAgencyMemberSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return {
                success: false,
                errors: validatedFields.error.flatten().fieldErrors,
                message: "Veuillez corriger les erreurs",
            }
        }

        // 3. Get authenticated user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return {
                success: false,
                message: "Non authentifié",
            }
        }

        // Get user's profile
        const { data: senderProfile, error: profileError } = await supabase
            .from("profiles")
            .select("agency_id, role, first_name, last_name")
            .eq("id", user.id)
            .single()

        if (profileError || !senderProfile?.agency_id) {
            return {
                success: false,
                message: "Aucune agence associée",
            }
        }

        // Get agency info for email content
        const { data: agency, error: agencyError } = await supabase
            .from("agencies")
            .select("name")
            .eq("id", senderProfile.agency_id)
            .single()


        if (agencyError || !agency) {
            return {
                success: false,
                message: "Agence introuvable",
            }
        }

        // Vérifier le quota de membres du plan
        const limitCheck = await checkMemberLimit(senderProfile.agency_id)
        if (!limitCheck.allowed) {
            return { success: false, message: limitCheck.reason }
        }

        // 1. Vérifier si l'utilisateur est déjà dans l'équipe
        const { data: existingMember } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", validatedFields.data.email)
            .eq("agency_id", senderProfile.agency_id)
            .maybeSingle()


        if (existingMember) {
            return {
                success: false,
                message: "Cet utilisateur est déjà dans l'équipe",
            }
        }

        // 2. Générer le token et l'expiration (7 jours)
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        // 3. Insérer dans agency_invites
        const { error: inviteError } = await supabase
            .from("agency_invites")
            .insert({
                agency_id: senderProfile.agency_id,
                email: validatedFields.data.email,
                role: validatedFields.data.role,
                invited_by: user.id,
                token: token,
                expires_at: expiresAt.toISOString(),
            })

        if (inviteError) {
            if (inviteError.code === '23505') return { success: false, message: "Une invitation est déjà en cours pour cet email" }
            throw inviteError
        }

        // 1. On récupère les infos nécessaires pour l'email
        const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/invite?token=${token}`;
        const inviterName = `${senderProfile.first_name} ${senderProfile.last_name}`;

        try {
            await sendEmail({
                to: validatedFields.data.email!,
                subject: `Invitation à rejoindre ${agency.name}`,
                template: InviteEmail({ agencyName: agency.name, inviterName, inviteLink }),
            })
        } catch (emailError) {
            console.error("Brevo Error:", emailError)
            return { success: false, message: "L'invitation a été créée mais l'email n'a pu être envoyé." }
        }

        revalidatePath("/settings/agency");
        revalidateTag(`settings-${user.id}`, {})

        return {
            success: true,
            message: `Invitation envoyée à ${validatedFields.data.email}`,
        }
    } catch (error) {
        console.error("Unexpected error:", error)
        return {
            success: false,
            message: "Erreur lors de l'envoi de l'invitation",
        }
    }
}


export async function resendInvitation(inviteId: string): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, message: "Non authentifié" }
        }

        const { data: senderProfile, error: profileError } = await supabase
            .from("profiles")
            .select("agency_id, role, first_name, last_name")
            .eq("id", user.id)
            .single()

        if (profileError || !senderProfile?.agency_id) {
            return { success: false, message: "Aucune agence associée" }
        }

        if (senderProfile.role !== 'agency_admin') {
            return { success: false, message: "Permissions insuffisantes" }
        }

        const { data: invite, error: inviteError } = await supabase
            .from("agency_invites")
            .select("email, role")
            .eq("id", inviteId)
            .eq("agency_id", senderProfile.agency_id)
            .eq("accepted", false)
            .single()

        if (inviteError || !invite) {
            return { success: false, message: "Invitation introuvable" }
        }

        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { error: updateError } = await supabase
            .from("agency_invites")
            .update({ token, expires_at: expiresAt.toISOString() })
            .eq("id", inviteId)

        if (updateError) throw updateError

        const { data: agency } = await supabase
            .from("agencies")
            .select("name")
            .eq("id", senderProfile.agency_id)
            .single()

        const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/invite?token=${token}`
        const inviterName = `${senderProfile.first_name} ${senderProfile.last_name}`

        try {
            await sendEmail({
                to: invite.email,
                subject: `Invitation à rejoindre ${agency?.name ?? ''}`,
                template: InviteEmail({ agencyName: agency?.name ?? '', inviterName, inviteLink }),
            })
        } catch (emailError) {
            console.error("Brevo Error:", emailError)
            return { success: false, message: "Erreur lors de l'envoi de l'email" }
        }

        revalidatePath("/settings/agency")
        revalidateTag(`settings-${user.id}`, {})
        return { success: true, message: `Invitation renvoyée à ${invite.email}` }
    } catch (error) {
        console.error("Unexpected error:", error)
        return { success: false, message: "Erreur inattendue" }
    }
}


export async function updateMemberRole(memberId: string, newRole: 'agency_admin' | 'agency_member'): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, message: "Non authentifié" }
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("agency_id, role")
            .eq("id", user.id)
            .single()

        if (profileError || !profile?.agency_id) {
            return { success: false, message: "Aucune agence associée à votre compte" }
        }

        if (profile.role !== 'agency_admin') {
            return { success: false, message: "Vous n'avez pas les permissions pour modifier un rôle" }
        }

        if (memberId === user.id) {
            return { success: false, message: "Vous ne pouvez pas modifier votre propre rôle" }
        }

        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ role: newRole })
            .eq("id", memberId)
            .eq("agency_id", profile.agency_id)

        if (updateError) {
            console.error("Error updating member role:", updateError)
            return { success: false, message: "Erreur lors de la mise à jour du rôle" }
        }

        revalidatePath("/app/agency")
        revalidateTag(`settings-${user.id}`, {})

        return { success: true, message: `Rôle mis à jour avec succès` }
    } catch (error) {
        console.error("Unexpected error:", error)
        return { success: false, message: "Une erreur inattendue s'est produite" }
    }
}

export async function removeTeamMember(memberId: string): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, message: "Non authentifié" }
        }

        // Get user's profile to find agency_id and check permissions
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("agency_id, role")
            .eq("id", user.id)
            .single()

        if (profileError || !profile?.agency_id) {
            return { success: false, message: "Aucune agence associée à votre compte" }
        }

        if (profile.role !== 'agency_admin') {
            return { success: false, message: "Vous n'avez pas les permissions pour supprimer un membre" }
        }

        // Remove member from agency (admin client bypasses RLS — auth checks done above)
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ agency_id: null, role: 'client' })
            .eq("id", memberId)
            .eq("agency_id", profile.agency_id)

        if (updateError) {
            console.error("Error removing member:", updateError)
            return { success: false, message: "Erreur lors de la suppression du membre" }
        }

        revalidatePath("/settings/agency")
        revalidateTag(`settings-${user.id}`, {})

        return { success: true, message: "Membre supprimé de l'agence" }
    } catch (error) {
        console.error("Unexpected error:", error)
        return { success: false, message: "Une erreur inattendue s'est produite" }
    }
}

export type AgencyMember = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
}

export async function getAgencyMembers(): Promise<AgencyMember[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (!profile?.agency_id) return []

    const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('agency_id', profile.agency_id)
        .order('first_name')

    return (data ?? []) as AgencyMember[]
}

// Add this new validator
const updateBrandingSchema = z.object({
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur invalide"),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur invalide"),
    // Note: The file itself is extracted directly from FormData before Zod validation 
    // because Zod doesn't natively handle File objects well in Server Actions without extra config.
});

export async function updateAgencyBranding(
    prevState: any,
    formData: FormData
) {
    try {
        const primaryColor = formData.get("primaryColor") as string;
        const secondaryColor = formData.get("secondaryColor") as string;
        const logoFile = formData.get("logo") as File | null;

        const validatedFields = updateBrandingSchema.safeParse({ primaryColor, secondaryColor });

        if (!validatedFields.success) {
            return { success: false, message: "Données invalides" };
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, message: "Non authentifié" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("agency_id, role")
            .eq("id", user.id)
            .single();

        if (!profile?.agency_id || profile.role !== 'agency_admin') {
            return { success: false, message: "Permissions insuffisantes" };
        }

        let logo_url = undefined;

        // Upload logo to Supabase Storage if a new file is provided
        if (logoFile && logoFile.size > 0) {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${profile.agency_id}-${Math.random()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('agency-branding')
                .upload(filePath, logoFile, { upsert: true });

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('agency-branding')
                .getPublicUrl(filePath);

            logo_url = publicUrl;
        }

        // Update the agency record
        const updateData: any = {
            primary_color: validatedFields.data.primaryColor,
            secondary_color: validatedFields.data.secondaryColor,
        };

        if (logo_url) updateData.logo_url = logo_url;

        const { error: updateError } = await supabase
            .from("agencies")
            .update(updateData)
            .eq("id", profile.agency_id);

        if (updateError) throw updateError;

        revalidatePath("/app/agency");
        revalidatePath("/app", "layout");
        revalidateTag(`settings-${user.id}`, {})
        return { success: true, message: "Branding mis à jour avec succès" };

    } catch (error) {
        console.error("Branding update error:", error);
        return { success: false, message: "Erreur lors de la mise à jour" };
    }
}