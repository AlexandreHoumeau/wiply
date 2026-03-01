'use server'

import { InviteEmail } from '@/emails/agency-invite'; // Ajustez le chemin
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkMemberLimit } from "@/lib/billing/checkLimit"
import { inviteAgencyMemberSchema, InviteAgencyMemberState, UpdateAgencyState } from "@/lib/validators/agency"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend'
import { z } from "zod"

const resend = new Resend(process.env.RESEND_API_KEY);
// Validation schema for agency information
const updateAgencySchema = z.object({
    name: z.string().min(1, "Le nom de l'agence est requis").max(200),
    website: z.string().url("URL invalide").optional().or(z.literal('')),
    phone: z.string().optional(),
    email: z.string().email("Email invalide").optional().or(z.literal('')),
    address: z.string().optional(),
})


export async function updateAgencyInformation(
    prevState: UpdateAgencyState | null,
    formData: FormData
): Promise<UpdateAgencyState> {
    try {
        // 1. Extract form data
        const rawData = {
            name: formData.get("name") as string,
            website: formData.get("website") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            address: formData.get("address") as string,
        }

        // 2. Validate with Zod
        const validatedFields = updateAgencySchema.safeParse(rawData)

        if (!validatedFields.success) {
            return {
                success: false,
                errors: validatedFields.error.flatten().fieldErrors,
                message: "Veuillez corriger les erreurs",
            }
        }

        // 3. Get authenticated user and their agency
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return {
                success: false,
                message: "Non authentifié",
            }
        }

        // Get user's profile to find agency_id
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("agency_id, role")
            .eq("id", user.id)
            .single()

        if (profileError || !profile?.agency_id) {
            return {
                success: false,
                message: "Aucune agence associée à votre compte",
            }
        }

        // Check if user has permission (admin only)
        if (profile.role !== 'agency_admin') {
            return {
                success: false,
                message: "Vous n'avez pas les permissions pour modifier l'agence",
            }
        }

        // 4. Update agency
        const { error: updateError } = await supabase
            .from("agencies")
            .update({
                name: validatedFields.data.name,
                website: validatedFields.data.website || null,
                phone: validatedFields.data.phone || null,
                email: validatedFields.data.email || null,
                address: validatedFields.data.address || null,
            })
            .eq("id", profile.agency_id)

        if (updateError) {
            console.error("Error updating agency:", updateError)
            return {
                success: false,
                message: "Erreur lors de la mise à jour de l'agence",
            }
        }

        // 5. Revalidate
        revalidatePath("/settings/agency")
        revalidatePath("/settings")

        return {
            success: true,
            message: "Agence mise à jour avec succès",
        }
    } catch (error) {
        console.error("Unexpected error:", error)
        return {
            success: false,
            message: "Une erreur inattendue s'est produite",
        }
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

        // 2. Envoi de l'email
        const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'Partie Commune <noreply@partiecommune.fr>',
            to: [validatedFields.data.email!],
            subject: `Invitation à rejoindre ${agency.name}`,
            react: InviteEmail({
                agencyName: agency.name,
                inviterName: inviterName,
                inviteLink: inviteLink,
            }),
        });

        if (error) {
            console.error("Resend Error:", error);
            // Optionnel : supprimer l'invitation en DB si l'email échoue
            return { success: false, message: "L'invitation a été créée mais l'email n'a pu être envoyé." };
        }

        revalidatePath("/settings/agency");

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
        return { success: true, message: "Branding mis à jour avec succès" };

    } catch (error) {
        console.error("Branding update error:", error);
        return { success: false, message: "Erreur lors de la mise à jour" };
    }
}