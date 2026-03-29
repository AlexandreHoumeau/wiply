import { getOpportunityBySlug } from "@/actions/opportunity.server";
import { getAIGeneratedMessages } from "@/actions/ai-messages";
import { getAuthenticatedUserContext } from "@/actions/profile.server";
import { ProPageGate } from "@/components/pro-page-gate";
import { isProPlan } from "@/lib/validators/agency";
import { AIMessageGenerator } from "../_components/AIMessageGenerator";

export default async function MessagePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const userContext = await getAuthenticatedUserContext();
    if (!userContext || !isProPlan(userContext.agency)) {
        return <ProPageGate feature="ai" />;
    }

    const opportunity = await getOpportunityBySlug(slug);
    if (!opportunity) return null;

    const { data: messages } = await getAIGeneratedMessages(opportunity.id);

    return (
        <div className="w-full max-w-4xl mx-auto">
            <AIMessageGenerator opportunity={opportunity} allMessages={messages ?? []} />
        </div>
    );
}
