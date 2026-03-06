"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
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

    let query = supabase
        .from("opportunities")
        .select("*, company:companies(*)", { count: "exact" })
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

    // Search filter - search in description field of opportunities
    // For company fields, we'll need to filter on the companies table
    if (search) {
        // Search in the description field of opportunities table
        query = query.ilike("description", `%${search}%`);
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

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let { data, count, error } = await query.range(from, to);

    // If we have a search term, also search in company name and email
    // We need to filter client-side or use a different approach
    if (search && data) {
        // First, get all opportunities that match company criteria
        const companyQuery = supabase
            .from("opportunities")
            .select("*, company:companies(*)", { count: "exact" })
            .eq("agency_id", agencyId);

        if (statuses && statuses.length > 0) {
            companyQuery.in("status", statuses);
        }

        if (contactVia && contactVia.length > 0) {
            companyQuery.in("contact_via", contactVia);
        }

        const { data: allData, error: allError } = await companyQuery;

        if (!allError && allData) {
            // Filter client-side for company name and email
            const searchLower = search.toLowerCase();
            const filtered = allData.filter((opp) => {
                const companyName = opp.company?.name?.toLowerCase() || "";
                const companyEmail = opp.company?.email?.toLowerCase() || "";
                const description = opp.description?.toLowerCase() || "";

                return (
                    companyName.includes(searchLower) ||
                    companyEmail.includes(searchLower) ||
                    description.includes(searchLower)
                );
            });

            // Sort by created_at
            filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Apply pagination manually
            const paginatedData = filtered.slice(from, to + 1);

            data = paginatedData as OpportunityWithCompany[];
            count = filtered.length;
        }
    }

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
        .select("status, agency_id, name")
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
            metadata: { opportunity_id: opportunityId, from: opp.status, to: status },
        });
    }
}
