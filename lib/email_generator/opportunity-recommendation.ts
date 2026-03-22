import { OpportunityStatus } from "@/lib/validators/oppotunities";

export type RecommendationLevel = "action" | "hot" | "warning" | "info" | "success" | "neutral";

export type CTAAction =
    | { label: string; tab: "message" | "tracking" }
    | { label: string; statusUpdate: OpportunityStatus };

export type Recommendation = {
    level: RecommendationLevel;
    iconName: string;
    title: string;
    description: string;
    primaryCta?: CTAAction;
    secondaryCta?: CTAAction;
};

export function getOpportunityRecommendation(params: {
    status: OpportunityStatus;
    aiMessageCount: number;
    totalClicks: number;
    daysSinceLastActivity: number;
    daysSinceLastClick: number | null; // null = never clicked
    hasTrackingLink: boolean;
}): Recommendation {
    const { status, aiMessageCount, totalClicks, daysSinceLastActivity, daysSinceLastClick, hasTrackingLink } = params;

    switch (status) {
        case "inbound":
            return {
                level: "action",
                iconName: "MessageCircle",
                title: "Prospect entrant — répondez à son initiative",
                description: "Ce prospect a pris contact en premier. Générez une réponse chaleureuse et personnalisée pour concrétiser l'opportunité.",
                primaryCta: { label: "Générer une réponse", tab: "message" },
                secondaryCta: { label: "Passer en 1er contact", statusUpdate: "first_contact" },
            };

        case "to_do":
            if (aiMessageCount === 0) {
                return {
                    level: "action",
                    iconName: "Wand2",
                    title: "Préparez votre premier message",
                    description: "Générez un message personnalisé pour initier le contact avec ce prospect.",
                    primaryCta: { label: "Générer un message", tab: "message" },
                };
            }
            if (!hasTrackingLink) {
                return {
                    level: "action",
                    iconName: "Link",
                    title: "Message prêt — ajoutez un lien de tracking",
                    description: "Avant d'envoyer, créez un lien de tracking pour savoir si votre prospect consulte votre contenu.",
                    primaryCta: { label: "Créer un lien de tracking", tab: "tracking" },
                    secondaryCta: { label: "Envoyer quand même", tab: "message" },
                };
            }
            return {
                level: "action",
                iconName: "Send",
                title: "Tout est prêt — passez à l'action !",
                description: "Message généré et lien de tracking actif. Envoyez votre message, puis marquez l'opportunité en « 1er contact ».",
                primaryCta: { label: "Voir le message", tab: "message" },
                secondaryCta: { label: "Passer en 1er contact", statusUpdate: "first_contact" },
            };

        case "first_contact":
            if (totalClicks > 0 && daysSinceLastClick !== null && daysSinceLastClick <= 1) {
                return {
                    level: "hot",
                    iconName: "Flame",
                    title: daysSinceLastClick === 0 ? "Votre prospect est sur votre lien en ce moment !" : "Votre prospect a visité votre lien hier",
                    description: "Le timing est parfait pour un message de suivi personnalisé. Ne laissez pas passer cette fenêtre.",
                    primaryCta: { label: "Envoyer un suivi immédiat", tab: "message" },
                };
            }
            if (totalClicks > 0) {
                return {
                    level: "hot",
                    iconName: "Flame",
                    title: "Votre prospect a visité votre lien",
                    description: `${totalClicks} visite${totalClicks > 1 ? "s" : ""} enregistrée${totalClicks > 1 ? "s" : ""}${daysSinceLastClick !== null ? ` — dernière il y a ${daysSinceLastClick} jour${daysSinceLastClick > 1 ? "s" : ""}` : ""}. Relancez pendant que l'intérêt est là.`,
                    primaryCta: { label: "Préparer un suivi", tab: "message" },
                    secondaryCta: { label: "Passer en 2e contact", statusUpdate: "second_contact" },
                };
            }
            if (daysSinceLastActivity >= 7) {
                return {
                    level: "warning",
                    iconName: "AlertCircle",
                    title: "Aucune réponse depuis longtemps",
                    description: `${daysSinceLastActivity} jours sans réponse ni engagement. Il est temps de relancer ou de passer officiellement au 2e contact.`,
                    primaryCta: { label: "Préparer une relance", tab: "message" },
                    secondaryCta: { label: "Passer en 2e contact", statusUpdate: "second_contact" },
                };
            }
            if (daysSinceLastActivity >= 3) {
                return {
                    level: "warning",
                    iconName: "Clock",
                    title: "Pensez à relancer",
                    description: `Pas de réponse depuis ${daysSinceLastActivity} jours. Un message de suivi peut faire la différence.`,
                    primaryCta: { label: "Préparer une relance", tab: "message" },
                };
            }
            if (!hasTrackingLink) {
                return {
                    level: "info",
                    iconName: "Link",
                    title: "Créez un lien de tracking",
                    description: "Ajoutez un lien de tracking à votre prochain message pour savoir quand votre prospect consulte votre contenu.",
                    primaryCta: { label: "Créer un lien", tab: "tracking" },
                };
            }
            return {
                level: "info",
                iconName: "Clock",
                title: "En attente de réponse",
                description: "Laissez quelques jours avant de relancer. Votre lien de tracking vous alertera dès que le prospect s'engage.",
            };

        case "second_contact":
            if (totalClicks > 0 && daysSinceLastClick !== null && daysSinceLastClick <= 1) {
                return {
                    level: "hot",
                    iconName: "Flame",
                    title: "Votre prospect consulte vos liens malgré tout",
                    description: "Clic très récent — l'intérêt est là même sans réponse directe. Tentez une approche différente et directe.",
                    primaryCta: { label: "Préparer un message direct", tab: "message" },
                };
            }
            if (totalClicks > 0) {
                return {
                    level: "hot",
                    iconName: "TrendingUp",
                    title: "Engagement silencieux",
                    description: `${totalClicks} visite${totalClicks > 1 ? "s" : ""} de vos liens sans réponse. Le prospect est curieux — soyez direct et concis.`,
                    primaryCta: { label: "Préparer un message ciblé", tab: "message" },
                };
            }
            if (daysSinceLastActivity >= 7) {
                return {
                    level: "warning",
                    iconName: "AlertCircle",
                    title: "Ce prospect ne répond pas",
                    description: `${daysSinceLastActivity} jours sans réponse après deux contacts. Tentez une dernière approche ou envisagez de clore cette opportunité.`,
                    primaryCta: { label: "Dernier message", tab: "message" },
                    secondaryCta: { label: "Marquer comme perdu", statusUpdate: "lost" },
                };
            }
            if (daysSinceLastActivity >= 4) {
                return {
                    level: "warning",
                    iconName: "MessageCircle",
                    title: "Essayez un autre canal",
                    description: `Aucune réponse depuis ${daysSinceLastActivity} jours. Un appel téléphonique, un message LinkedIn ou une rencontre directe peut changer la donne.`,
                    primaryCta: { label: "Changer d'approche", tab: "message" },
                };
            }
            return {
                level: "info",
                iconName: "Clock",
                title: "Deuxième contact en cours",
                description: "Attendez quelques jours avant de relancer à nouveau pour ne pas paraître insistant.",
            };

        case "proposal_sent":
            if (totalClicks > 0 && daysSinceLastClick !== null && daysSinceLastClick <= 2) {
                return {
                    level: "hot",
                    iconName: "TrendingUp",
                    title: "Proposition consultée très récemment !",
                    description: `Votre prospect étudie votre proposition (dernière visite : ${daysSinceLastClick === 0 ? "aujourd'hui" : daysSinceLastClick === 1 ? "hier" : "il y a 2 jours"}). C'est le moment parfait pour proposer un appel.`,
                    primaryCta: { label: "Proposer un appel", tab: "message" },
                    secondaryCta: { label: "Passer en négociation", statusUpdate: "negotiation" },
                };
            }
            if (totalClicks > 0) {
                return {
                    level: "hot",
                    iconName: "TrendingUp",
                    title: "Proposition consultée",
                    description: `${totalClicks} visite${totalClicks > 1 ? "s" : ""}${daysSinceLastClick !== null ? ` — dernière il y a ${daysSinceLastClick} jour${daysSinceLastClick > 1 ? "s" : ""}` : ""}. Relancez pour recueillir les impressions et débloquer la décision.`,
                    primaryCta: { label: "Relancer sur la proposition", tab: "message" },
                    secondaryCta: { label: "Passer en négociation", statusUpdate: "negotiation" },
                };
            }
            if (daysSinceLastActivity >= 10) {
                return {
                    level: "warning",
                    iconName: "AlertCircle",
                    title: "Proposition sans retour depuis longtemps",
                    description: `${daysSinceLastActivity} jours sans réponse ni consultation. Tentez une dernière relance franche avant de décider de clore.`,
                    primaryCta: { label: "Dernière relance", tab: "message" },
                    secondaryCta: { label: "Marquer comme perdu", statusUpdate: "lost" },
                };
            }
            if (daysSinceLastActivity >= 5) {
                return {
                    level: "warning",
                    iconName: "FileText",
                    title: "Relancez votre proposition",
                    description: `Votre proposition attend depuis ${daysSinceLastActivity} jours. Une relance douce peut débloquer la décision.`,
                    primaryCta: { label: "Préparer une relance", tab: "message" },
                };
            }
            return {
                level: "info",
                iconName: "FileText",
                title: "Proposition envoyée",
                description: "Laissez le temps à votre prospect d'étudier votre proposition. Le lien de tracking vous alertera dès qu'il la consulte.",
            };

        case "negotiation":
            if (daysSinceLastActivity >= 7) {
                return {
                    level: "warning",
                    iconName: "AlertCircle",
                    title: "Négociation au point mort",
                    description: `Pas d'activité depuis ${daysSinceLastActivity} jours. Relancez pour débloquer, ou prenez une décision ferme.`,
                    primaryCta: { label: "Relancer la négociation", tab: "message" },
                    secondaryCta: { label: "Marquer comme gagné", statusUpdate: "won" },
                };
            }
            if (daysSinceLastActivity >= 3) {
                return {
                    level: "action",
                    iconName: "Handshake",
                    title: "Gardez le momentum",
                    description: "La négociation avance, mais pas d'activité récente. Un message de suivi peut accélérer la décision finale.",
                    primaryCta: { label: "Préparer un message", tab: "message" },
                };
            }
            return {
                level: "action",
                iconName: "Handshake",
                title: "Négociation active",
                description: "Restez réactif et préparez des réponses claires aux objections. Vous êtes bien positionné.",
                primaryCta: { label: "Préparer un message", tab: "message" },
            };

        case "won":
            if (aiMessageCount === 0) {
                return {
                    level: "success",
                    iconName: "PartyPopper",
                    title: "Deal gagné, bravo !",
                    description: "Préparez un message de bienvenue chaleureux pour bien démarrer la collaboration.",
                    primaryCta: { label: "Message de bienvenue", tab: "message" },
                };
            }
            return {
                level: "success",
                iconName: "PartyPopper",
                title: "Deal gagné !",
                description: "Tout est en ordre. Entretenez la relation avec votre nouveau client pour assurer un démarrage réussi.",
                primaryCta: { label: "Envoyer un message", tab: "message" },
            };

        case "lost":
            return {
                level: "neutral",
                iconName: "RotateCcw",
                title: "Opportunité perdue",
                description: "Fermez proprement avec un message professionnel. Dans quelques semaines, une tentative de reconquête peut valoir le coup.",
                primaryCta: { label: "Message de clôture", tab: "message" },
            };
    }
}
