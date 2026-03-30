"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50)
        + "-" + Math.random().toString(36).substring(2, 7);
}

export async function completeOnboarding({
    agencyName,
    firstName,
    lastName,
}: {
    agencyName: string;
    firstName: string;
    lastName: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // Guard: if profile already exists with an agency, skip onboarding
    const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, agency_id")
        .eq("id", user.id)
        .single();

    if (existingProfile?.agency_id) return { success: true };

    const slug = generateSlug(agencyName.trim());

    // Step 1: Create agency WITHOUT owner_id (owner_id FK references profiles.id which doesn't exist yet)
    const { data: agency, error: agencyError } = await supabaseAdmin
        .from("agencies")
        .insert({ name: agencyName.trim(), slug })
        .select()
        .single();

    if (agencyError || !agency) {
        console.error("[onboarding] agency insert error:", JSON.stringify(agencyError));
        throw new Error("Impossible de créer l'agence");
    }

    // Step 2: Attach the current user to the new agency.
    // If the profile already exists but was detached from any agency, update it in place.
    const profilePayload = {
        agency_id: agency.id,
        role: "agency_admin" as const,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: user.email,
    };

    const profileMutation = existingProfile
        ? supabaseAdmin
            .from("profiles")
            .update(profilePayload)
            .eq("id", user.id)
        : supabaseAdmin
            .from("profiles")
            .insert({
                id: user.id,
                ...profilePayload,
            });

    const { error: profileError } = await profileMutation;

    if (profileError) {
        // Rollback agency
        await supabaseAdmin.from("agencies").delete().eq("id", agency.id);
        console.error("[onboarding] profile insert error:", JSON.stringify(profileError));
        throw new Error("Impossible de créer le profil");
    }

    // Step 3: Now that the profile exists, set owner_id on the agency
    const { error: ownerError } = await supabaseAdmin
        .from("agencies")
        .update({ owner_id: user.id })
        .eq("id", agency.id);

    if (ownerError) {
        console.error("[onboarding] agency owner_id update error:", JSON.stringify(ownerError));
        // Non-fatal: profile and agency exist, just owner_id not set
    }

    revalidatePath("/", "layout");
    redirect("/app");
}
