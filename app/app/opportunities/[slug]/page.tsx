import { getOpportunityBySlug } from "@/actions/opportunity.server";
import { getOpportunityTimeline } from "@/actions/timeline.server";
import { getTrackingLinks } from "@/actions/tracking.server";
import { getAIGeneratedMessages } from "@/actions/ai-messages";
import OpportunityOverview from "./_components/opportunity-overview";

export default async function OverviewPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const opportunity = await getOpportunityBySlug(slug);

    if (!opportunity) return null;

    const [eventsResult, trackingResult, messagesResult] = await Promise.all([
        getOpportunityTimeline(opportunity.id),
        getTrackingLinks(opportunity.id),
        getAIGeneratedMessages(opportunity.id),
    ]);

    return (
        <OpportunityOverview
            opportunity={opportunity}
            initialEvents={eventsResult.data ?? []}
            trackingLinks={trackingResult.data ?? []}
            aiMessages={messagesResult.data ?? []}
        />
    );
}
