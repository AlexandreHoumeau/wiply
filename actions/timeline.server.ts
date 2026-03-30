"use server";

import { createClient } from "@/lib/supabase/server";
import { OpportunityEvent } from "@/lib/validators/oppotunities";
import { revalidatePath } from "next/cache";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Une erreur inattendue est survenue";
}

export async function getOpportunityTimeline(
    opportunityId: string
): Promise<{ success: boolean; data: OpportunityEvent[]; error?: string }> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("opportunity_events")
            .select("*, user:profiles(first_name, last_name)")
            .eq("opportunity_id", opportunityId)
            .order("created_at", { ascending: false });

        if (error) return { success: false, data: [], error: error.message };
        return { success: true, data: (data as OpportunityEvent[]) || [] };
    } catch (error: unknown) {
        return { success: false, data: [], error: getErrorMessage(error) };
    }
}

export async function addOpportunityNote(
    opportunityId: string,
    text: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Non authentifié." };

        // Verify the opportunity belongs to the user's agency
        const { data: opp, error: oppError } = await supabase
            .from("opportunities")
            .select("id, agency_id")
            .eq("id", opportunityId)
            .single();

        if (oppError || !opp) return { success: false, error: "Opportunité introuvable." };

        const { data: profile } = await supabase
            .from("profiles")
            .select("agency_id")
            .eq("id", user.id)
            .single();

        if (!profile || profile.agency_id !== opp.agency_id) {
            return { success: false, error: "Accès non autorisé." };
        }

        const { error } = await supabase.from("opportunity_events").insert({
            opportunity_id: opportunityId,
            user_id: user.id,
            event_type: "note_added",
            metadata: { text: text.trim() },
        });

        if (error) return { success: false, error: error.message };

        revalidatePath(`/app/opportunities/${opp.id}/timeline`);
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}
