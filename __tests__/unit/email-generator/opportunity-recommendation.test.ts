import { getOpportunityRecommendation } from "@/lib/email_generator/opportunity-recommendation";
import { OpportunityStatus } from "@/lib/validators/oppotunities";
import { describe, it, expect } from "vitest";

// Helper to quickly generate default parameters
const getDefaultParams = (overrides: Partial<Parameters<typeof getOpportunityRecommendation>[0]> = {}) => ({
    status: "to_do" as OpportunityStatus,
    aiMessageCount: 1,
    totalClicks: 0,
    daysSinceLastActivity: 0,
    daysSinceLastClick: null,
    hasTrackingLink: true,
    ...overrides,
});

describe("getOpportunityRecommendation", () => {
    describe("status: to_do", () => {
        it("returns action to generate message if no AI messages", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "to_do", aiMessageCount: 0 }));
            expect(result.level).toBe("action");
            expect(result.iconName).toBe("Wand2");
            expect(result.primaryCta?.label).toBe("Générer un message");
        });

        it("returns action to add tracking link if missing", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "to_do", hasTrackingLink: false }));
            expect(result.level).toBe("action");
            expect(result.iconName).toBe("Link");
            // expect(result.primaryCta?.tab).toBe("tracking");
            expect(result.secondaryCta?.label).toBe("Envoyer quand même");
        });

        it("returns action to send if everything is ready", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "to_do", hasTrackingLink: true }));
            expect(result.level).toBe("action");
            expect(result.iconName).toBe("Send");
            // expect(result.secondaryCta?.statusUpdate).toBe("first_contact");
        });
    });

    describe("status: first_contact", () => {
        it("returns hot if clicked today", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", totalClicks: 1, daysSinceLastClick: 0 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Votre prospect est sur votre lien en ce moment !");
        });

        it("returns hot if clicked yesterday", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", totalClicks: 1, daysSinceLastClick: 1 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Votre prospect a visité votre lien hier");
        });

        it("returns hot for older clicks", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", totalClicks: 2, daysSinceLastClick: 3 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Votre prospect a visité votre lien");
            expect(result.description).toContain("2 visites");
            // expect(result.secondaryCta?.statusUpdate).toBe("second_contact");
        });

        it("returns warning if no response for >= 7 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", daysSinceLastActivity: 7 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("AlertCircle");
            // expect(result.secondaryCta?.statusUpdate).toBe("second_contact");
        });

        it("returns warning if no response for >= 3 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", daysSinceLastActivity: 4 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("Clock");
            expect(result.title).toBe("Pensez à relancer");
        });

        it("returns info to create tracking link if missing", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", hasTrackingLink: false }));
            expect(result.level).toBe("info");
            expect(result.iconName).toBe("Link");
            // expect(result.primaryCta?.tab).toBe("tracking");
        });

        it("returns info waiting status by default", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "first_contact", daysSinceLastActivity: 1, hasTrackingLink: true }));
            expect(result.level).toBe("info");
            expect(result.title).toBe("En attente de réponse");
        });
    });

    describe("status: second_contact", () => {
        it("returns hot if clicked recently (<= 1 day)", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "second_contact", totalClicks: 1, daysSinceLastClick: 0 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Votre prospect consulte vos liens malgré tout");
        });

        it("returns hot for older clicks", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "second_contact", totalClicks: 1, daysSinceLastClick: 3 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Engagement silencieux");
        });

        it("returns warning if no response for >= 7 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "second_contact", daysSinceLastActivity: 7 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("AlertCircle");
            // expect(result.secondaryCta?.statusUpdate).toBe("lost");
        });

        it("returns warning if no response for >= 4 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "second_contact", daysSinceLastActivity: 5 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("MessageCircle");
        });

        it("returns info waiting status by default", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "second_contact", daysSinceLastActivity: 2 }));
            expect(result.level).toBe("info");
            expect(result.title).toBe("Deuxième contact en cours");
        });
    });

    describe("status: proposal_sent", () => {
        it("returns hot if clicked recently (<= 2 days)", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "proposal_sent", totalClicks: 1, daysSinceLastClick: 2 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Proposition consultée très récemment !");
            expect(result.description).toContain("il y a 2 jours");
        });

        it("returns hot for older clicks", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "proposal_sent", totalClicks: 3, daysSinceLastClick: 4 }));
            expect(result.level).toBe("hot");
            expect(result.title).toBe("Proposition consultée");
        });

        it("returns warning if no response for >= 10 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "proposal_sent", daysSinceLastActivity: 10 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("AlertCircle");
            // expect(result.secondaryCta?.statusUpdate).toBe("lost");
        });

        it("returns warning if no response for >= 5 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "proposal_sent", daysSinceLastActivity: 6 }));
            expect(result.level).toBe("warning");
            expect(result.iconName).toBe("FileText");
        });

        it("returns info waiting status by default", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "proposal_sent", daysSinceLastActivity: 3 }));
            expect(result.level).toBe("info");
            expect(result.title).toBe("Proposition envoyée");
        });
    });

    describe("status: negotiation", () => {
        it("returns warning if no activity for >= 7 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "negotiation", daysSinceLastActivity: 8 }));
            expect(result.level).toBe("warning");
            expect(result.title).toBe("Négociation au point mort");
            // expect(result.secondaryCta?.statusUpdate).toBe("won");
        });

        it("returns action if no activity for >= 3 days", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "negotiation", daysSinceLastActivity: 4 }));
            expect(result.level).toBe("action");
            expect(result.title).toBe("Gardez le momentum");
        });

        it("returns action by default", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "negotiation", daysSinceLastActivity: 1 }));
            expect(result.level).toBe("action");
            expect(result.title).toBe("Négociation active");
        });
    });

    describe("status: won", () => {
        it("returns success with welcome message CTA if no AI messages", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "won", aiMessageCount: 0 }));
            expect(result.level).toBe("success");
            expect(result.title).toBe("Deal gagné, bravo !");
            expect(result.primaryCta?.label).toBe("Message de bienvenue");
        });

        it("returns success by default", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "won", aiMessageCount: 1 }));
            expect(result.level).toBe("success");
            expect(result.title).toBe("Deal gagné !");
            expect(result.primaryCta?.label).toBe("Envoyer un message");
        });
    });

    describe("status: lost", () => {
        it("returns neutral closure status", () => {
            const result = getOpportunityRecommendation(getDefaultParams({ status: "lost" }));
            expect(result.level).toBe("neutral");
            expect(result.iconName).toBe("RotateCcw");
            expect(result.title).toBe("Opportunité perdue");
        });
    });
});