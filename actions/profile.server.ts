'use server'

import { createClient } from "@/lib/supabase/server";
import { AuthUserContext } from "@/lib/validators/definitions";
import { NotificationPreferences, Profile, updateProfileSchema, UpdateProfileState } from "@/lib/validators/profile";
import { revalidatePath, revalidateTag } from "next/cache";

export async function fetchUserProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
        throw new Error("Not authenticated");
    }

    const userId = data.user.id;

    const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }

    return profileData;
}

export async function updateProfile(
    prevState: UpdateProfileState | null,
    formData: FormData
): Promise<UpdateProfileState> {
    try {
        // 1. Extract form data
        const rawData = {
            first_name: formData.get("first_name") as string,
            last_name: formData.get("last_name") as string,
            phone: formData.get("phone") as string,
        }

        // 2. Validate with Zod
        const validatedFields = updateProfileSchema.safeParse(rawData)

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
        // 4. Update profile
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                first_name: validatedFields.data.first_name,
                last_name: validatedFields.data.last_name,
                phone: validatedFields.data.phone || null,
            })
            .eq("id", user.id)


        if (updateError) {
            console.error("Error updating profile:", updateError)
            return {
                success: false,
                message: "Erreur lors de la mise à jour du profil",
            }
        }

        // 5. Revalidate the settings page
        revalidatePath("/settings/profile")
        revalidateTag(`settings-${user.id}`, {})

        return {
            success: true,
            message: "Profil mis à jour avec succès",
        }
    } catch (error) {
        console.error("Unexpected error:", error)
        return {
            success: false,
            message: "Une erreur inattendue s'est produite",
        }
    }
}

export async function updateNotificationPreferences(
    prefs: NotificationPreferences
): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, message: "Non authentifié" }

        const { error } = await supabase
            .from("profiles")
            .update(prefs)
            .eq("id", user.id)

        if (error) return { success: false, message: "Erreur lors de la mise à jour" }

        revalidateTag(`settings-${user.id}`, {})
        return { success: true, message: "Préférences mises à jour" }
    } catch {
        return { success: false, message: "Erreur inattendue" }
    }
}

export async function getAuthenticatedUserContext(): Promise<AuthUserContext | null> {
    try {
        const supabase = await createClient()

        // 1. Get the Auth User ID
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return null

        // 2. Fetch Profile joined with Agency
        // We use the '!' notation to specify which foreign key to follow
        const { data, error } = await supabase
            .from("profiles")
            .select(`
                *,
                agency:agencies!profiles_agency_id_fkey (*)
            `)
            .eq("id", user.id)
            .single()

        if (error || !data) {
            console.error("Error fetching user context:", error)
            return null
        }

        // 'data' now matches the AuthUserContext type
        return data as AuthUserContext
    } catch (e) {
        console.error("Unexpected error:", e)
        return null
    }
}