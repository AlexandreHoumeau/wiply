// services/onboarding.service.ts
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCampaignDemoDays, incrementCampaignUses } from "@/lib/billing/demoCampaigns";

function generateAgencySlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50)
        + "-" + Math.random().toString(36).substring(2, 7);
}

export async function bootstrapUser(invitationToken?: string | null) { // <-- On ajoute le token ici
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use admin client to bypass RLS — a re-invited user may have agency_id = null
  // which causes RLS to hide their profile from the regular client, leading to a
  // false "profile not found" and a duplicate key error on INSERT.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) return profile;

  const meta = user.user_metadata;
  let targetAgencyId = meta?.agency_id;
  let userRole = meta?.role || "agency_user";

  // --- NOUVEAU : Récupération via le Token d'invitation ---
  if (!targetAgencyId && invitationToken) {
    const { data: invite } = await supabaseAdmin
      .from('agency_invites')
      .select('agency_id, role')
      .eq('token', invitationToken)
      .single();

    if (invite) {
      targetAgencyId = invite.agency_id;
      userRole = invite.role;
    }
  }

  // --- CAS A : NOUVELLE AGENCE (OWNER) ---
  if (!targetAgencyId && meta?.agency_name) {
    const campaignCode = meta?.campaign_code ?? null
    const demoDays = await getCampaignDemoDays(campaignCode)
    const demoEndsAt = demoDays
      ? new Date(Date.now() + demoDays * 24 * 3600 * 1000).toISOString()
      : null

    // Insert agency without owner_id first: owner_id FK references profiles.id which doesn't exist yet
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .insert({
        name: meta.agency_name,
        slug: generateAgencySlug(meta.agency_name),
        ...(demoEndsAt && { demo_ends_at: demoEndsAt }),
      })
      .select()
      .single();

    if (agencyError) throw agencyError;

    if (demoDays && campaignCode) {
      incrementCampaignUses(campaignCode).catch(console.error)
    }

    targetAgencyId = agency.id;
    userRole = "agency_admin";
  }

  if (!targetAgencyId) {
    console.warn("Bootstrap: No agency found for user", user.id);
    return null;
  }

  // 3. Create profile (agency exists so agency_id FK is satisfied)
  const { data: newProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      agency_id: targetAgencyId,
      role: userRole,
      first_name: meta?.first_name || "",
      last_name: meta?.last_name || "",
      email: user.email,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback: delete the agency we just created to avoid orphaned records on retry
    if (userRole === "agency_admin") {
      await supabaseAdmin.from("agencies").delete().eq("id", targetAgencyId);
    }
    throw profileError;
  }

  // 4. If this user owns the agency, set owner_id now that the profile exists
  if (userRole === "agency_admin") {
    await supabaseAdmin
      .from("agencies")
      .update({ owner_id: user.id })
      .eq("id", targetAgencyId);
  }

  return newProfile;
}