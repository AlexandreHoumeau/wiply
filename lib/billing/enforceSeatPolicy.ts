import { PLANS, PlanId } from "@/lib/config/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getEffectivePlan(plan: string | null, demoEndsAt: string | null): PlanId {
    if (demoEndsAt && new Date(demoEndsAt) > new Date()) return "PRO";
    return (plan as PlanId) || "FREE";
}

export async function enforceAgencySeatPolicy(agencyId: string): Promise<void> {
    const { data: agency, error: agencyError } = await supabaseAdmin
        .from("agencies")
        .select("plan, demo_ends_at, owner_id")
        .eq("id", agencyId)
        .single();

    if (agencyError || !agency?.owner_id) return;

    const plan = getEffectivePlan(agency.plan, agency.demo_ends_at);
    if (PLANS[plan].max_members > 1) return;

    const { data: extraMembers, error: membersError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("agency_id", agencyId)
        .neq("id", agency.owner_id);

    if (membersError) {
        console.error("Seat policy member fetch error:", membersError);
        return;
    }

    const memberIds = (extraMembers ?? []).map((member) => member.id);

    if (memberIds.length > 0) {
        const { error: removeError } = await supabaseAdmin
            .from("profiles")
            .update({ agency_id: null, role: "client" })
            .in("id", memberIds)
            .eq("agency_id", agencyId);

        if (removeError) {
            console.error("Seat policy member removal error:", removeError);
        }
    }

    const { error: inviteError } = await supabaseAdmin
        .from("agency_invites")
        .delete()
        .eq("agency_id", agencyId)
        .eq("accepted", false);

    if (inviteError) {
        console.error("Seat policy invite cleanup error:", inviteError);
    }
}
