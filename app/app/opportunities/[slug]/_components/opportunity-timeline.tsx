"use client";

import { useState, useTransition } from "react";
import { addOpportunityNote, getOpportunityTimeline } from "@/actions/timeline.server";
import { OpportunityEvent, mapOpportunityStatusLabel } from "@/lib/validators/oppotunities";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Sparkles,
    ArrowRight,
    Pencil,
    MessageSquare,
    Wand2,
    Link,
    Loader2,
    Clock,
    Send,
} from "lucide-react";

// --- Date formatters ---
function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

    if (isToday) return "Aujourd'hui";

    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
    });
}

// --- Event config ---
type EventConfig = {
    icon: React.ReactNode;
    color: string;
    label: (metadata: Record<string, any>) => React.ReactNode;
};

const STATUS_BADGE_COLOR: Record<string, string> = {
    to_do: "bg-muted text-muted-foreground border-border",
    first_contact: "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/40",
    second_contact: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
    proposal_sent: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
    negotiation: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    won: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
    lost: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
};

function StatusBadge({ status }: { status: string }) {
    const label = mapOpportunityStatusLabel[status as keyof typeof mapOpportunityStatusLabel] ?? status;
    const color = STATUS_BADGE_COLOR[status] ?? "bg-muted text-muted-foreground border-border";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
            {label}
        </span>
    );
}

const EVENT_CONFIG: Record<string, EventConfig> = {
    created: {
        icon: <Sparkles className="w-4 h-4" />,
        color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
        label: () => "a créé l'opportunité",
    },
    status_changed: {
        icon: <ArrowRight className="w-4 h-4" />,
        color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
        label: () => "a changé le statut",
    },
    info_updated: {
        icon: <Pencil className="w-4 h-4" />,
        color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        label: () => "a mis à jour les informations",
    },
    note_added: {
        icon: <MessageSquare className="w-4 h-4" />,
        color: "bg-muted text-muted-foreground border-border",
        label: () => "a laissé une note",
    },
    ai_message_generated: {
        icon: <Wand2 className="w-4 h-4" />,
        color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        label: (m) => `a généré un message IA${m.channel ? ` via ${m.channel}` : ""}`,
    },
    tracking_link_created: {
        icon: <Link className="w-4 h-4" />,
        color: "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40",
        label: (m) => `a créé un lien de tracking${m.campaign_name ? ` (${m.campaign_name})` : ""}`,
    },
};

// --- Avatar Component ---
function Avatar({ user, className = "w-6 h-6 text-[10px]" }: { user: OpportunityEvent["user"], className?: string }) {
    if (!user) {
        return (
            <div className={`rounded-full bg-muted flex items-center justify-center border border-border shadow-sm ${className}`}>
                <Wand2 className="w-1/2 h-1/2 text-muted-foreground" />
            </div>
        );
    }
    const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "?";

    return (
        <div
            className={`rounded-full bg-foreground text-background flex items-center justify-center font-medium tracking-wide shadow-sm ${className}`}
            title={`${user.first_name} ${user.last_name}`}
        >
            {initials}
        </div>
    );
}

// --- Author Name Component ---
function AuthorName({ user }: { user: OpportunityEvent["user"] }) {
    if (!user) return <span className="font-semibold text-foreground">Le système</span>;
    return (
        <span className="font-semibold text-foreground">
            {user.first_name} {user.last_name}
        </span>
    );
}

// --- Single Event Row (Center-Axis Layout) ---
function EventRow({ event }: { event: OpportunityEvent }) {
    const config = EVENT_CONFIG[event.event_type];
    if (!config) return null;

    const isNote = event.event_type === "note_added";
    const isStatusChange = event.event_type === "status_changed";

    return (
        <div className="group relative flex w-full">
            {/* Left Column: Date & Time */}
            <div className="w-24 shrink-0 text-right pr-6 pt-1.5 pb-8 group-last:pb-0">
                <div className="text-sm font-semibold text-foreground">{formatTime(event.created_at)}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{formatDate(event.created_at)}</div>
            </div>

            {/* Middle Column: Axis & Icon */}
            <div className="relative flex flex-col items-center">
                {/* The vertical line */}
                <div className="absolute top-8 bottom-[-1rem] w-px bg-border/60 group-last:hidden" />

                {/* The Icon */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-[3px] border-background shadow-sm ${config.color}`}>
                    {config.icon}
                </div>
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 pl-6 pb-8 group-last:pb-0 pt-1.5 min-w-0">
                {isNote ? (
                    <div className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/50">
                            <Avatar user={event.user} className="w-6 h-6 text-[10px]" />
                            <div className="text-sm text-muted-foreground">
                                <AuthorName user={event.user} /> a laissé une note
                            </div>
                        </div>
                        <div className="p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {event.metadata.text}
                        </div>
                    </div>
                ) : isStatusChange ? (
                    <div className="flex items-center gap-2 bg-muted/50 border border-transparent rounded-xl px-4 py-2 hover:bg-card hover:border-border/60 hover:shadow-sm transition-all w-fit max-w-full">
                        <Avatar user={event.user} className="w-5 h-5 text-[9px]" />
                        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            <AuthorName user={event.user} />
                            {event.metadata.from && <StatusBadge status={event.metadata.from} />}
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                            {event.metadata.to && <StatusBadge status={event.metadata.to} />}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-muted/50 border border-transparent rounded-xl px-4 py-2 hover:bg-card hover:border-border/60 hover:shadow-sm transition-all w-fit max-w-full">
                        <Avatar user={event.user} className="w-5 h-5 text-[9px]" />
                        <div className="text-sm text-muted-foreground truncate">
                            <AuthorName user={event.user} /> <span className="text-muted-foreground/70">{config.label(event.metadata)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main component ---
export default function OpportunityTimeline({
    opportunityId,
    initialEvents,
}: {
    opportunityId: string;
    initialEvents: OpportunityEvent[];
}) {
    const [events, setEvents] = useState<OpportunityEvent[]>(initialEvents);
    const [note, setNote] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleAddNote = () => {
        if (!note.trim()) return;
        startTransition(async () => {
            const result = await addOpportunityNote(opportunityId, note);
            if (result.success) {
                setNote("");
                const { data: fresh } = await getOpportunityTimeline(opportunityId);
                setEvents(fresh);
                toast.success("Note ajoutée avec succès");
            } else {
                toast.error(result.error ?? "Erreur lors de l'ajout de la note.");
            }
        });
    };

    return (
        <div className="w-full max-w-3xl mx-auto py-6">

            {/* Centered Composer */}
            <div className="mb-12 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-muted via-background to-muted rounded-[24px] blur-sm opacity-50 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative bg-card border border-border/80 rounded-[20px] shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-foreground/5 focus-within:border-border transition-all">
                    <Textarea
                        placeholder="Rédiger une note ou un point de suivi..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[100px] resize-none border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent px-5 py-4 text-sm placeholder:text-muted-foreground"
                        disabled={isPending}
                    />
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border/50">
                        <span className="text-xs font-medium text-muted-foreground px-1">
                            Appuyez sur Entrée pour des retours à la ligne
                        </span>
                        <Button
                            onClick={handleAddNote}
                            disabled={isPending || !note.trim()}
                            className="bg-foreground hover:bg-foreground/90 text-background rounded-full h-9 px-5 text-sm font-medium transition-all shadow-sm"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Publier la note
                        </Button>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-3xl bg-muted/50">
                        <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-sm border border-border mb-4">
                            <Clock className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Historique vierge</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                            Toutes les actions et notes liées à cette opportunité s'afficheront ici.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {events.map((event) => (
                            <EventRow key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
