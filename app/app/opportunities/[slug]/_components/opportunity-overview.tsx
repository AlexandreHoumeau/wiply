"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
    Wand2,
    Send,
    Flame,
    Clock,
    Link as LinkIcon,
    MessageCircle,
    TrendingUp,
    FileText,
    Handshake,
    PartyPopper,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    Circle,
    XCircle,
    ArrowRight,
    Sparkles,
    Pencil,
    MessageSquare,
    BarChart3,
    Calendar,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    OpportunityWithCompany,
    OpportunityStatus,
    OpportunityEvent,
    mapOpportunityStatusLabel,
} from "@/lib/validators/oppotunities";
import {
    getOpportunityRecommendation,
    Recommendation,
    RecommendationLevel,
    CTAAction,
} from "@/lib/email_generator/opportunity-recommendation";
import { updateOpportunityStatus } from "@/actions/opportunity.client";

// --- Status pipeline stages ---
const PIPELINE_STAGES: { id: OpportunityStatus; label: string }[] = [
    { id: "to_do", label: "À faire" },
    { id: "first_contact", label: "1er contact" },
    { id: "second_contact", label: "2e contact" },
    { id: "proposal_sent", label: "Proposition" },
    { id: "negotiation", label: "Négociation" },
    { id: "won", label: "Gagné" },
];

// --- Recommendation icon map ---
const ICON_MAP: Record<string, React.ReactNode> = {
    Wand2: <Wand2 className="w-5 h-5" />,
    Send: <Send className="w-5 h-5" />,
    Flame: <Flame className="w-5 h-5" />,
    Clock: <Clock className="w-5 h-5" />,
    Link: <LinkIcon className="w-5 h-5" />,
    MessageCircle: <MessageCircle className="w-5 h-5" />,
    TrendingUp: <TrendingUp className="w-5 h-5" />,
    FileText: <FileText className="w-5 h-5" />,
    Handshake: <Handshake className="w-5 h-5" />,
    PartyPopper: <PartyPopper className="w-5 h-5" />,
    RotateCcw: <RotateCcw className="w-5 h-5" />,
    AlertCircle: <AlertCircle className="w-5 h-5" />,
};

// --- Recommendation level styles ---
const LEVEL_STYLES: Record<RecommendationLevel, { card: string; icon: string; primaryCta: string; secondaryCta: string }> = {
    hot: {
        card: "border-orange-200 bg-orange-50",
        icon: "bg-orange-100 text-orange-600",
        primaryCta: "bg-orange-600 hover:bg-orange-700 text-white",
        secondaryCta: "border border-orange-300 text-orange-700 hover:bg-orange-100",
    },
    warning: {
        card: "border-amber-200 bg-amber-50",
        icon: "bg-amber-100 text-amber-600",
        primaryCta: "bg-amber-600 hover:bg-amber-700 text-white",
        secondaryCta: "border border-amber-300 text-amber-700 hover:bg-amber-100",
    },
    action: {
        card: "border-indigo-200 bg-indigo-50",
        icon: "bg-indigo-100 text-indigo-600",
        primaryCta: "bg-indigo-600 hover:bg-indigo-700 text-white",
        secondaryCta: "border border-indigo-300 text-indigo-700 hover:bg-indigo-100",
    },
    success: {
        card: "border-emerald-200 bg-emerald-50",
        icon: "bg-emerald-100 text-emerald-600",
        primaryCta: "bg-emerald-600 hover:bg-emerald-700 text-white",
        secondaryCta: "border border-emerald-300 text-emerald-700 hover:bg-emerald-100",
    },
    info: {
        card: "border-slate-200 bg-slate-50",
        icon: "bg-slate-100 text-slate-600",
        primaryCta: "bg-slate-700 hover:bg-slate-800 text-white",
        secondaryCta: "border border-slate-300 text-slate-700 hover:bg-slate-100",
    },
    neutral: {
        card: "border-slate-200 bg-white",
        icon: "bg-slate-100 text-slate-500",
        primaryCta: "bg-slate-700 hover:bg-slate-800 text-white",
        secondaryCta: "border border-slate-300 text-slate-600 hover:bg-slate-100",
    },
};

// --- Mini timeline event config ---
const MINI_EVENT_CONFIG: Record<
    string,
    { icon: React.ReactNode; color: string; label: (m: Record<string, any>) => string }
> = {
    created: {
        icon: <Sparkles className="w-3.5 h-3.5" />,
        color: "bg-violet-100 text-violet-600",
        label: () => "Opportunité créée",
    },
    status_changed: {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        color: "bg-blue-100 text-blue-600",
        label: (m) =>
            m.to ? `Statut → ${mapOpportunityStatusLabel[m.to as OpportunityStatus] ?? m.to}` : "Statut modifié",
    },
    info_updated: {
        icon: <Pencil className="w-3.5 h-3.5" />,
        color: "bg-amber-100 text-amber-600",
        label: () => "Informations mises à jour",
    },
    note_added: {
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        color: "bg-slate-100 text-slate-600",
        label: () => "Note ajoutée",
    },
    ai_message_generated: {
        icon: <Wand2 className="w-3.5 h-3.5" />,
        color: "bg-emerald-100 text-emerald-600",
        label: (m) => `Message IA généré${m.channel ? ` (${m.channel})` : ""}`,
    },
    tracking_link_created: {
        icon: <LinkIcon className="w-3.5 h-3.5" />,
        color: "bg-cyan-100 text-cyan-600",
        label: () => "Lien de tracking créé",
    },
};

function formatRelativeDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getDaysSince(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Sub-components ---

function StatusPipeline({ status }: { status: OpportunityStatus }) {
    const isLost = status === "lost";
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === status);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Progression
                </span>
            </div>

            {isLost ? (
                <div className="flex items-center gap-3 py-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-red-600">Opportunité perdue</p>
                        <p className="text-xs text-slate-400">Cette opportunité a été marquée comme perdue</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {PIPELINE_STAGES.map((stage, index) => {
                        const isPast = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isFuture = index > currentIndex;

                        return (
                            <div key={stage.id} className="flex items-center shrink-0">
                                <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                                    <div
                                        className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                            isPast && "bg-emerald-500",
                                            isCurrent && "ring-2 ring-offset-2 shadow-sm",
                                            isFuture && "bg-slate-100"
                                        )}
                                        style={
                                            isCurrent
                                                ? { backgroundColor: "var(--brand-secondary, #6366F1)" }
                                                : undefined
                                        }
                                    >
                                        {isPast && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        {isCurrent && <Circle className="w-3 h-3 text-white fill-white" />}
                                        {isFuture && <Circle className="w-3 h-3 text-slate-300" />}
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] font-medium text-center leading-tight whitespace-nowrap",
                                            isPast && "text-emerald-600",
                                            isCurrent && "text-slate-900 font-bold",
                                            isFuture && "text-slate-400"
                                        )}
                                    >
                                        {stage.label}
                                    </span>
                                </div>

                                {index < PIPELINE_STAGES.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 w-6 mx-0.5 mb-4 shrink-0 rounded-full",
                                            index < currentIndex ? "bg-emerald-400" : "bg-slate-200"
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CTAButton({
    cta,
    slug,
    opportunityId,
    variant,
    className,
    onStatusUpdated,
}: {
    cta: CTAAction;
    slug: string;
    opportunityId: string;
    variant: "primary" | "secondary";
    className: string;
    onStatusUpdated: () => void;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    if ("tab" in cta) {
        return (
            <Link
                href={`/app/opportunities/${slug}/${cta.tab}`}
                className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                    className
                )}
            >
                {cta.label}
                {variant === "primary" && <ArrowRight className="w-3.5 h-3.5" />}
            </Link>
        );
    }

    const handleStatusUpdate = async () => {
        setIsUpdating(true);
        try {
            await updateOpportunityStatus(opportunityId, cta.statusUpdate);
            toast.success(`Statut mis à jour : ${mapOpportunityStatusLabel[cta.statusUpdate]}`);
            onStatusUpdated();
        } catch {
            toast.error("Impossible de mettre à jour le statut");
            setIsUpdating(false);
        }
    };

    return (
        <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        >
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {cta.label}
        </button>
    );
}

function RecommendationCard({
    recommendation,
    slug,
    opportunityId,
    onStatusUpdated,
}: {
    recommendation: Recommendation;
    slug: string;
    opportunityId: string;
    onStatusUpdated: () => void;
}) {
    const styles = LEVEL_STYLES[recommendation.level];
    const icon = ICON_MAP[recommendation.iconName];

    return (
        <div className={cn("rounded-2xl border p-5 shadow-sm", styles.card)}>
            <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", styles.icon)}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 mb-1">{recommendation.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{recommendation.description}</p>

                    {(recommendation.primaryCta || recommendation.secondaryCta) && (
                        <div className="flex items-center flex-wrap gap-2 mt-3">
                            {recommendation.primaryCta && (
                                <CTAButton
                                    cta={recommendation.primaryCta}
                                    slug={slug}
                                    opportunityId={opportunityId}
                                    variant="primary"
                                    className={styles.primaryCta}
                                    onStatusUpdated={onStatusUpdated}
                                />
                            )}
                            {recommendation.secondaryCta && (
                                <CTAButton
                                    cta={recommendation.secondaryCta}
                                    slug={slug}
                                    opportunityId={opportunityId}
                                    variant="secondary"
                                    className={styles.secondaryCta}
                                    onStatusUpdated={onStatusUpdated}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickStats({
    aiMessageCount,
    activeLinksCount,
    daysSinceLastActivity,
}: {
    aiMessageCount: number;
    activeLinksCount: number;
    daysSinceLastActivity: number;
}) {
    const stats = [
        {
            icon: <Wand2 className="w-4 h-4 text-emerald-500" />,
            value: aiMessageCount,
            label: aiMessageCount === 1 ? "message généré" : "messages générés",
        },
        {
            icon: <LinkIcon className="w-4 h-4 text-cyan-500" />,
            value: activeLinksCount,
            label: activeLinksCount === 1 ? "lien actif" : "liens actifs",
        },
        {
            icon: <Calendar className="w-4 h-4 text-slate-400" />,
            value: daysSinceLastActivity,
            label: daysSinceLastActivity === 1 ? "jour sans activité" : "jours sans activité",
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-center">
                    <div className="flex justify-center mb-2">{stat.icon}</div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}

function MiniTimeline({ events, slug }: { events: OpportunityEvent[]; slug: string }) {
    const recent = events.slice(0, 5);

    if (recent.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Activité récente
                </p>
                <p className="text-sm text-slate-400 text-center py-4">Aucune activité pour l'instant</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Activité récente
            </p>
            <div className="space-y-3">
                {recent.map((event) => {
                    const config = MINI_EVENT_CONFIG[event.event_type];
                    if (!config) return null;

                    return (
                        <div key={event.id} className="flex items-start gap-3">
                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.color)}>
                                {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700 leading-snug">
                                    {config.label(event.metadata ?? {})}
                                </p>
                                {event.event_type === "note_added" && event.metadata?.content && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{event.metadata.content}</p>
                                )}
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                                {formatRelativeDate(event.created_at)}
                            </span>
                        </div>
                    );
                })}
            </div>

            <Link
                href={`/app/opportunities/${slug}/timeline`}
                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <BarChart3 className="w-3.5 h-3.5" />
                Voir toute la timeline
                <ArrowRight className="w-3 h-3" />
            </Link>
        </div>
    );
}

// --- Types ---

export type TrackingLink = {
    id: string;
    is_active: boolean;
    last_clicked_at: string | null;
    [key: string]: unknown;
};

export type AIMessage = {
    id: string;
    [key: string]: unknown;
};

// --- Main component ---

export default function OpportunityOverview({
    opportunity,
    initialEvents,
    trackingLinks,
    aiMessages,
}: {
    opportunity: OpportunityWithCompany;
    initialEvents: OpportunityEvent[];
    trackingLinks: TrackingLink[];
    aiMessages: AIMessage[];
}) {
    const router = useRouter();
    const status = opportunity.status as OpportunityStatus;
    const slug = opportunity.slug;

    const hasTrackingLink = trackingLinks.length > 0;
    const clickedLinksCount = trackingLinks.filter((l) => l.last_clicked_at !== null).length;
    const aiMessageCount = aiMessages.length;
    const activeLinksCount = trackingLinks.filter((l) => l.is_active).length;

    // Most recent click across all tracking links
    const lastClickedAt = trackingLinks
        .map((l) => l.last_clicked_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
    const daysSinceLastClick = lastClickedAt ? getDaysSince(lastClickedAt) : null;

    // Days since last relevant activity
    const relevantEvents = initialEvents.filter((e) =>
        ["status_changed", "note_added", "ai_message_generated", "created"].includes(e.event_type)
    );
    const lastActivityDate = relevantEvents.length > 0 ? relevantEvents[0].created_at : opportunity.created_at;
    const daysSinceLastActivity = getDaysSince(lastActivityDate);

    const recommendation = getOpportunityRecommendation({
        status,
        aiMessageCount,
        totalClicks: clickedLinksCount,
        daysSinceLastActivity,
        daysSinceLastClick,
        hasTrackingLink,
    });

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4">
            <StatusPipeline status={status} />
            <RecommendationCard
                recommendation={recommendation}
                slug={slug}
                opportunityId={opportunity.id}
                onStatusUpdated={() => router.refresh()}
            />
            <QuickStats
                aiMessageCount={aiMessageCount}
                activeLinksCount={activeLinksCount}
                daysSinceLastActivity={daysSinceLastActivity}
            />
            <MiniTimeline events={initialEvents} slug={slug} />
        </div>
    );
}
