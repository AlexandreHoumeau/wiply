import { fetchOpportunities, fetchOpportunityStatusCounts } from "@/actions/opportunity.server";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import { ALL_CONTACT_VIA, ALL_STATUSES, ContactVia, OpportunityStatus } from "@/lib/validators/oppotunities";
import OpportunitiesPage from "./OpportunitiesPage";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const userContext = await getAuthenticatedUserContext();

    if (!userContext) {
        return null;
    }

    const params = await searchParams;
    const page = Number(Array.isArray(params.page) ? params.page[0] : params.page ?? "1");
    const pageSize = Number(Array.isArray(params.pageSize) ? params.pageSize[0] : params.pageSize ?? "10");
    const search = Array.isArray(params.search) ? params.search[0] : params.search ?? "";
    const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
    const contactViaParam = Array.isArray(params.contact_via) ? params.contact_via[0] : params.contact_via;
    const starred = (Array.isArray(params.starred) ? params.starred[0] : params.starred) === "true";

    const statuses = statusParam ? (statusParam.split(",") as OpportunityStatus[]) : ALL_STATUSES;
    const contactVia = contactViaParam ? (contactViaParam.split(",") as ContactVia[]) : ALL_CONTACT_VIA;

    const [initialData, initialStatusCounts] = await Promise.all([
        fetchOpportunities({
            page: Number.isNaN(page) ? 1 : page,
            pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
            search: search || undefined,
            statuses: statuses.length === ALL_STATUSES.length ? undefined : statuses,
            contactVia: contactVia.length === ALL_CONTACT_VIA.length ? undefined : contactVia,
            agencyId: userContext.agency_id,
            isFavorite: starred || undefined,
        }),
        fetchOpportunityStatusCounts(userContext.agency_id),
    ]);

    return (
        <OpportunitiesPage
            initialData={initialData}
            initialStatusCounts={initialStatusCounts}
        />
    );
}
