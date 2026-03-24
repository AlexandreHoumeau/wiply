"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
    Copy, Loader2, Mail, MapPin, Phone, Save, Trash2, SendHorizonal, Wand2, Zap,
} from "lucide-react";

import {
    AIMessageRow,
    ChatMessage,
    clearConversation,
    getAIGeneratedMessages,
    getConversation,
    saveAIGeneratedMessage,
    sendChatMessage,
} from "@/actions/ai-messages";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OpportunityWithCompany, OpportunityStatus, OpportunityEvent } from "@/lib/validators/oppotunities";
import { cn } from "@/lib/utils";

// Lucide doesn't export non-deprecated LinkedIn/Instagram icons — use SVG inline
function LinkedinSvg({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
        </svg>
    );
}
function InstagramSvg({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    );
}

const channelOptions = [
    { value: "email",     label: "Email",       icon: Mail },
    { value: "linkedin",  label: "LinkedIn",    icon: LinkedinSvg },
    { value: "instagram", label: "Instagram",   icon: InstagramSvg },
    { value: "phone",     label: "Téléphone",   icon: Phone },
    { value: "IRL",       label: "En personne", icon: MapPin },
];
const toneOptions   = [{ value: "formal", label: "Formel" }, { value: "friendly", label: "Aimable" }, { value: "casual", label: "Décontracté" }];
const lengthOptions = [{ value: "short", label: "Court" }, { value: "medium", label: "Moyen" }];

const statusGenerateLabel: Record<OpportunityStatus, string> = {
    inbound:        "une réponse à leur prise de contact",
    to_do:          "un message de première approche",
    first_contact:  "une relance après un premier échange",
    second_contact: "une deuxième relance",
    proposal_sent:  "une relance après envoi de proposition",
    negotiation:    "un message pour avancer la négociation",
    won:            "un message de bienvenue",
    lost:           "un message de clôture élégant",
};

const channelLabel: Record<string, string> = {
    email: "par email",
    linkedin: "sur LinkedIn",
    instagram: "sur Instagram",
    phone: "pour un appel téléphonique",
    IRL: "pour une rencontre",
};

function buildAutoPrompt(channel: string, status: string): string {
    const what = statusGenerateLabel[status as OpportunityStatus] ?? "un message de prospection";
    const via = channelLabel[channel] ?? "par email";
    return `Rédige ${what} ${via}.`;
}

function extractEmailParts(content: string): { subject: string | null; body: string } {
    const lines = content.split("\n");
    const subjectLineIndex = lines.findIndex(l => /^(objet|sujet|subject)\s*:/i.test(l.trim()));
    if (subjectLineIndex !== -1) {
        const subject = lines[subjectLineIndex].replace(/^(objet|sujet|subject)\s*:\s*/i, "").trim();
        const body = lines.slice(subjectLineIndex + 1).join("\n").trim();
        return { subject, body };
    }
    return { subject: null, body: content };
}

function formatRelativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// --- Sub-components ---

type TrackingLinkRow = {
    id: string;
    short_code: string;
    is_active: boolean;
    campaign_name: string | null;
};

function UserBubble({ content }: { content: string }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[78%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
                {content}
            </div>
        </div>
    );
}

function AssistantBubble({
    content,
    loading,
    channel,
    opportunityId,
    onSaved,
}: {
    content?: string;
    loading?: boolean;
    channel: string;
    opportunityId: string;
    onSaved?: () => void;
}) {
    const [saved, setSaved] = useState(false);
    const [isSaving, startSaveTransition] = useTransition();

    const handleCopy = () => {
        navigator.clipboard.writeText(content || "");
        toast.success("Copié !");
    };

    const handleSave = () => {
        if (!content) return;
        startSaveTransition(async () => {
            const { subject, body } = channel === "email"
                ? extractEmailParts(content)
                : { subject: null, body: content };

            const result = await saveAIGeneratedMessage({
                opportunityId,
                channel,
                tone: "friendly",
                length: "medium",
                subject: subject || undefined,
                body,
            });

            if (result.success) {
                setSaved(true);
                toast.success("Brouillon enregistré !");
                onSaved?.();
            } else {
                toast.error("Erreur lors de l'enregistrement");
            }
        });
    };

    return (
        <div className="flex justify-start gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mt-0.5 shadow-sm">
                <Wand2 className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[78%] flex flex-col gap-1.5">
                <div className={cn(
                    "bg-muted/60 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed",
                    loading && "min-w-[3rem] flex items-center justify-center py-3"
                )}>
                    {loading
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : <span className="whitespace-pre-wrap">{content}</span>
                    }
                </div>
                {!loading && content && (
                    <div className="flex gap-2 px-1">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Copy className="h-3 w-3" />
                            Copier
                        </button>
                        <span className="text-border">·</span>
                        <button
                            onClick={handleSave}
                            disabled={saved || isSaving}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <Save className="h-3 w-3" />
                            {saved ? "Enregistré" : isSaving ? "Enregistrement..." : "Enregistrer comme brouillon"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({
    onGenerate,
    onSuggestion,
    isLoading,
}: {
    onGenerate: () => void;
    onSuggestion: (prompt: string) => void;
    isLoading: boolean;
}) {
    const suggestions = [
        "Rends le message plus court et percutant",
        "Propose un appel de 20 minutes",
        "Reformule avec un angle différent",
        "Traduis le message en anglais",
    ];

    return (
        <div className="flex-1 bg-card flex flex-col items-center justify-center gap-6 py-12 px-8 text-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-md">
                    <Wand2 className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">Générez votre message</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        L&apos;IA connaît déjà le contexte de cette opportunité. Générez un premier brouillon en un clic.
                    </p>
                </div>
            </div>

            <Button
                onClick={onGenerate}
                disabled={isLoading}
                size="sm"
                className="gap-2 px-5 shadow-sm"
            >
                {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Zap className="h-4 w-4" />
                }
                {isLoading ? "Génération..." : "Générer un brouillon"}
            </Button>

            <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Ou donnez une instruction précise
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            onClick={() => onSuggestion(s)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-full border border-border bg-background text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main component ---

export function AIMessageChat({
    opportunity,
    notes,
    trackingLinks,
}: {
    opportunity: OpportunityWithCompany;
    notes: OpportunityEvent[];
    trackingLinks: TrackingLinkRow[];
}) {
    const { profile } = useUserProfile();
    const agencyId = profile?.agency_id;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [channel, setChannel] = useState<string>(
        (opportunity.contact_via as string) || "email"
    );
    const [tone, setTone] = useState("friendly");
    const [length, setLength] = useState("medium");

    const activeTrackingLink = trackingLinks.find(l => l.is_active) ?? null;
    const [includeTracking, setIncludeTracking] = useState(!!activeTrackingLink);
    const [drafts, setDrafts] = useState<AIMessageRow[]>([]);
    const [draftRefreshKey, setDraftRefreshKey] = useState(0);

    const bottomRef = useRef<HTMLDivElement>(null);

    // Load persisted conversation on mount
    useEffect(() => {
        getConversation(opportunity.id).then(({ data }) => {
            if (data?.messages?.length) setMessages(data.messages);
        });
    }, [opportunity.id]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Load saved drafts
    useEffect(() => {
        getAIGeneratedMessages(opportunity.id).then(({ data }) => {
            setDrafts(data);
        });
    }, [opportunity.id, draftRefreshKey]);

    const trackingLinkUrl =
        includeTracking && activeTrackingLink
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/t/${activeTrackingLink.short_code}`
            : null;

    const dispatchMessage = useCallback((userMessage: string) => {
        if (!userMessage.trim() || isLoading || isPending) return;

        const userMsg: ChatMessage = { role: "user", content: userMessage.trim(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        startTransition(async () => {
            try {
                const result = await sendChatMessage({
                    opportunityId: opportunity.id,
                    agencyId,
                    userMessage: userMessage.trim(),
                    opportunity,
                    channel,
                    tone,
                    length,
                    notes: notes.map(n => n.metadata?.text).filter(Boolean) as string[],
                    trackingLinkUrl,
                });

                if (result.error || !result.content) {
                    toast.error(result.error || "Erreur de génération");
                    setMessages(prev => prev.slice(0, -1));
                } else {
                    const aiMsg: ChatMessage = {
                        role: "assistant",
                        content: result.content,
                        created_at: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, aiMsg]);
                }
            } catch {
                toast.error("Erreur lors de la génération");
                setMessages(prev => prev.slice(0, -1));
            } finally {
                setIsLoading(false);
            }
        });
    }, [isLoading, isPending, opportunity, agencyId, channel, tone, length, notes, trackingLinkUrl]);

    const handleSend = useCallback(() => dispatchMessage(input), [input, dispatchMessage]);
    const handleGenerate = useCallback(() => dispatchMessage(buildAutoPrompt(channel, opportunity.status as string)), [channel, opportunity.status, dispatchMessage]);
    const handleSuggestion = useCallback((prompt: string) => dispatchMessage(prompt), [dispatchMessage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        startTransition(async () => {
            await clearConversation(opportunity.id);
            setMessages([]);
        });
    };

    const isEmpty = messages.length === 0 && !isLoading;

    return (
        <div className="flex h-full min-h-0 bg-background border rounded-lg overflow-hidden">
            {/* ── LEFT SIDEBAR ── */}
            <div className="w-[220px] shrink-0 flex flex-col border-r bg-card overflow-y-auto">
                <div className="flex flex-col gap-4 p-3">

                    {/* Channel */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Canal</p>
                        <div className="grid grid-cols-2 gap-1">
                            {channelOptions.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setChannel(value)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer",
                                        channel === value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tone */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ton</p>
                        <div className="flex flex-col gap-1">
                            {toneOptions.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setTone(value)}
                                    className={cn(
                                        "px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer text-left",
                                        tone === value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Length */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Longueur</p>
                        <div className="flex flex-col gap-1">
                            {lengthOptions.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setLength(value)}
                                    className={cn(
                                        "px-2 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer text-left",
                                        length === value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tracking link toggle — only when active link exists */}
                    {activeTrackingLink && (
                        <>
                            <div className="h-px bg-border" />
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor="tracking-toggle" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                                    Inclure le lien de suivi
                                </label>
                                <Switch
                                    id="tracking-toggle"
                                    checked={includeTracking}
                                    onCheckedChange={setIncludeTracking}
                                />
                            </div>
                        </>
                    )}

                    {/* Notes — only when notes exist */}
                    {notes.length > 0 && (
                        <>
                            <div className="h-px bg-border" />
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Notes · {notes.length}
                                </p>
                                <div className="flex flex-col gap-1.5">
                                    {notes.map((note, i) => (
                                        <p
                                            key={i}
                                            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                                        >
                                            {note.metadata?.text}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Saved drafts */}
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Brouillons</p>
                            {drafts.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Aucun brouillon enregistré</p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {drafts.map((draft) => {
                                        const draftChannel = channelOptions.find(c => c.value === draft.channel);
                                        const Icon = draftChannel?.icon;
                                        return (
                                            <button
                                                key={draft.id}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(draft.body);
                                                    toast.success("Copié !");
                                                }}
                                                className="flex items-start gap-1.5 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors group"
                                            >
                                                {Icon && <Icon className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-foreground line-clamp-1 group-hover:text-foreground">
                                                        {draft.body}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {formatRelativeDate(draft.created_at)}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>

                    {/* Clear conversation — only when messages exist */}
                    {messages.length > 0 && (
                        <>
                            <div className="h-px bg-border" />
                            <button
                                onClick={handleClear}
                                disabled={isPending}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Effacer la conversation
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── CHAT AREA ── */}
            <div className="flex-1 flex flex-col min-h-0">
                {isEmpty ? (
                    <div className="flex-1 flex">
                        <EmptyState
                            onGenerate={handleGenerate}
                            onSuggestion={handleSuggestion}
                            isLoading={isLoading}
                        />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-5 flex flex-col gap-5">
                            {messages.map((msg, i) =>
                                msg.role === "user"
                                    ? <UserBubble key={i} content={msg.content} />
                                    : (
                                        <AssistantBubble
                                            key={i}
                                            content={msg.content}
                                            channel={channel}
                                            opportunityId={opportunity.id}
                                            onSaved={() => setDraftRefreshKey(k => k + 1)}
                                        />
                                    )
                            )}
                            {isLoading && (
                                <AssistantBubble
                                    loading
                                    channel={channel}
                                    opportunityId={opportunity.id}
                                    onSaved={() => setDraftRefreshKey(k => k + 1)}
                                />
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </ScrollArea>
                )}

                {/* Input */}
                <div className="border-t px-4 py-3 flex gap-2 items-end shrink-0 bg-card">
                    <Textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isEmpty
                            ? "Ou décrivez précisément ce que vous voulez..."
                            : "Donnez une instruction : \"rends-le plus court\", \"change le ton\"..."
                        }
                        className="flex-1 min-h-0 resize-none text-sm"
                        rows={2}
                    />
                    <div className="flex flex-col gap-1.5 self-end">
                        {isEmpty && (
                            <Button
                                onClick={handleGenerate}
                                disabled={isPending || isLoading}
                                size="sm"
                                className="gap-1.5 whitespace-nowrap"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Générer
                            </Button>
                        )}
                        <Button
                            onClick={handleSend}
                            disabled={isPending || isLoading || !input.trim()}
                            size="sm"
                            variant={isEmpty ? "outline" : "default"}
                            className="self-end"
                        >
                            <SendHorizonal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
