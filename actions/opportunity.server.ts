"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { getPostHogClient } from "@/lib/posthog-server";
import { OpportunityWithCompany } from "@/lib/validators/oppotunities";
import { OpportunityStatus, ContactVia } from "@/lib/validators/oppotunities";

export type FetchOpportunitiesParams = {
    page: number;
    pageSize: number;
    search?: string;
    statuses?: OpportunityStatus[];
    contactVia?: ContactVia[];
    agencyId: string;
    isFavorite?: boolean;
};

export async function getOpportunityBySlug(slug: string): Promise<OpportunityWithCompany | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("opportunities")
        .select(`
            *,
            company:companies (*)
        `)
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("Error fetching opportunity by slug:", error);
        return null;
    }

    return data || null;
}

export async function fetchOpportunities({
    page,
    pageSize,
    search,
    statuses,
    contactVia,
    agencyId,
    isFavorite,
}: FetchOpportunitiesParams) {
    const supabase = await createClient();
    const normalizedSearch = search?.trim();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let matchingCompanyIds: string[] = [];

    if (normalizedSearch) {
        const companySearchTerm = `%${normalizedSearch}%`;
        const { data: matchingCompanies, error: companySearchError } = await supabase
            .from("companies")
            .select("id")
            .eq("agency_id", agencyId)
            .or(`name.ilike.${companySearchTerm},email.ilike.${companySearchTerm}`);

        if (companySearchError) {
            console.error("Error fetching companies for opportunity search:", companySearchError);
            throw companySearchError;
        }

        matchingCompanyIds = (matchingCompanies ?? []).map((company) => company.id);
    }

    let query = supabase
        .from("opportunities")
        .select("*, company:companies(*)", { count: "exact" })
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

    if (normalizedSearch) {
        const opportunitySearchClauses = [
            `name.ilike.%${normalizedSearch}%`,
            `description.ilike.%${normalizedSearch}%`,
        ];

        if (matchingCompanyIds.length > 0) {
            opportunitySearchClauses.push(`company_id.in.(${matchingCompanyIds.join(",")})`);
        }

        query = query.or(opportunitySearchClauses.join(","));
    }

    // Status filter
    if (statuses && statuses.length > 0) {
        query = query.in("status", statuses);
    }

    // Contact via filter
    if (contactVia && contactVia.length > 0) {
        query = query.in("contact_via", contactVia);
    }

    // Starred filter
    if (isFavorite) {
        query = query.eq("is_favorite", true);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
        console.error("Error fetching opportunities:", error);
        throw error;
    }

    return {
        opportunities: (data || []) as OpportunityWithCompany[],
        total: count ?? 0,
    };
}

export async function fetchOpportunityStatusCounts(agencyId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("opportunities")
        .select("status")
        .eq("agency_id", agencyId);

    if (error) {
        console.error("Error fetching opportunity status counts:", error);
        throw error;
    }

    // Count statuses
    const counts = (data || []).reduce<Record<OpportunityStatus, number>>(
        (acc, { status }: { status: OpportunityStatus }) => {
            acc[status] = (acc[status] ?? 0) + 1;
            return acc;
        },
        {
            inbound: 0,
            to_do: 0,
            first_contact: 0,
            second_contact: 0,
            proposal_sent: 0,
            negotiation: 0,
            won: 0,
            lost: 0,
        }
    );

    return counts;
}

export async function updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus
): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch current status and agency_id in one query
    const { data: opp } = await supabase
        .from("opportunities")
        .select("status, agency_id, name, slug")
        .eq("id", opportunityId)
        .single();

    if (!opp) return;

    await supabase
        .from("opportunities")
        .update({ status })
        .eq("id", opportunityId);

    // Log timeline event
    await supabase.from("opportunity_events").insert({
        opportunity_id: opportunityId,
        user_id: user.id,
        event_type: "status_changed",
        metadata: { from: opp.status, to: status },
    });

    // Notify all agency members except the person who made the change
    const { data: members } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("agency_id", opp.agency_id)
        .neq("id", user.id);

    for (const member of members ?? []) {
        await createNotification({
            agencyId: opp.agency_id,
            userId: member.id,
            type: "opportunity_status_changed",
            title: "Opportunité mise à jour",
            body: `"${opp.name}" est passé à ${status.replace(/_/g, " ")}`,
            metadata: { opportunity_id: opportunityId, opportunity_slug: opp.slug, from: opp.status, to: status },
        });
    }

    const posthog = getPostHogClient();
    posthog?.capture({
        distinctId: user.id,
        event: "opportunity_status_changed",
        properties: {
            opportunity_id: opportunityId,
            from_status: opp.status,
            to_status: status,
            agency_id: opp.agency_id,
        },
    });
    await posthog?.shutdown();
}
