"use client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { OpportunityStatus, ContactVia, ALL_STATUSES, ALL_CONTACT_VIA } from "@/lib/validators/oppotunities";
import { fetchOpportunities, fetchOpportunityStatusCounts } from "@/actions/opportunity.server";

type UseOpportunitiesOptions = {
    pageSize?: number;
    agencyId: string;
    enabled?: boolean;
};

export function useOpportunities({ pageSize = 10, agencyId, enabled = true }: UseOpportunitiesOptions) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse URL params
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status");
    const contactViaParam = searchParams.get("contact_via");
    const pageSizeParam = parseInt(searchParams.get("pageSize") || pageSize.toString(), 10);
    const starredOnly = searchParams.get("starred") === "true";

    const statuses = statusParam
        ? (statusParam.split(",") as OpportunityStatus[])
        : ALL_STATUSES;

    const contactVia = contactViaParam
        ? (contactViaParam.split(",") as ContactVia[])
        : ALL_CONTACT_VIA;

    // Fetch data with React Query
    const { data, isLoading, error } = useQuery({
        queryKey: ["opportunities", { page, pageSize: pageSizeParam, search, statuses, contactVia, agencyId, starredOnly }],
        queryFn: () =>
            fetchOpportunities({
                page,
                pageSize: pageSizeParam,
                search,
                statuses: statuses.length === ALL_STATUSES.length ? undefined : statuses,
                contactVia: contactVia.length === ALL_CONTACT_VIA.length ? undefined : contactVia,
                agencyId,
                isFavorite: starredOnly || undefined,
            }),
        enabled: enabled && !!agencyId,
        staleTime: 30000, // Cache for 30 seconds
    });

    // Fetch status counts (all opportunities, not filtered)
    const { data: statusCounts } = useQuery({
        queryKey: ["opportunities-status-counts", agencyId],
        queryFn: () => fetchOpportunityStatusCounts(agencyId),
        enabled: enabled && !!agencyId,
        staleTime: 60000, // Cache for 1 minute
    });



    // Update URL function
    const updateURL = (updates: Record<string, string | string[]>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length === 0 || (key === "status" && value.length === ALL_STATUSES.length) || (key === "contact_via" && value.length === ALL_CONTACT_VIA.length)) {
                    params.delete(key);
                } else {
                    params.set(key, value.join(","));
                }
            } else if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        router.push(`${pathname}?${params.toString()}`);
    };

    return {
        opportunities: data?.opportunities || [],
        total: data?.total || 0,
        page,
        starredOnly,
        statusCounts: statusCounts || {
            to_do: 0,
            first_contact: 0,
            second_contact: 0,
            proposal_sent: 0,
            negotiation: 0,
            won: 0,
            lost: 0,
        },
        pageSize: pageSizeParam,
        search,
        statuses,
        contactVia,
        isLoading,
        error,
        updateURL,
    };
}