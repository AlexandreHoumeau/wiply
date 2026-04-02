"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import {
    AlertCircle, ChevronDown, Copy, Instagram,
    Link2, LinkedinIcon, Loader2, Mail, Phone, MapPin, Save, Wand2,
} from "lucide-react";

import { generateOpportunityMessage, saveAIGeneratedMessage, updateAIGeneratedMessage, AIMessageRow } from "@/actions/ai-messages";
import { createTrackingLink, getTrackingLinks } from "@/actions/tracking.server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OpportunityAIContext } from "@/lib/email_generator/utils";
import { ContactVia, OpportunityStatus, mapOpportunityStatusLabel } from "@/lib/validators/oppotunities";
import { cn } from "@/lib/utils";
import { useAgency } from "@/providers/agency-provider";
type LinkRecord = { id: string; is_active: boolean; [key: string]: unknown };

// --- Pipeline order for stage pills ---
const PIPELINE_ORDER: OpportunityStatus[] = [
    "inbound", "to_do", "first_contact", "second_contact", "proposal_sent", "negotiation", "won", "lost",
];

const STAGE_PILL_STYLES: Record<OpportunityStatus, { bg: string; text: string }> = {
    inbound:        { bg: "bg-cyan-50 dark:bg-cyan-950/40",              text: "text-cyan-700 dark:text-cyan-400" },
    to_do:          { bg: "bg-muted",                                    text: "text-muted-foreground" },
    first_contact:  { bg: "bg-blue-50 dark:bg-blue-950/40",              text: "text-blue-700 dark:text-blue-400" },
    second_contact: { bg: "bg-indigo-50 dark:bg-indigo-950/40",          text: "text-indigo-700 dark:text-indigo-400" },
    proposal_sent:  { bg: "bg-amber-50 dark:bg-amber-950/40",            text: "text-amber-700 dark:text-amber-400" },
    negotiation:    { bg: "bg-violet-50 dark:bg-violet-950/40",          text: "text-violet-700 dark:text-violet-400" },
    won:            { bg: "bg-emerald-50 dark:bg-emerald-950/40",        text: "text-emerald-700 dark:text-emerald-400" },
    lost:           { bg: "bg-red-50 dark:bg-red-950/40",                text: "text-red-600 dark:text-red-400" },
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
    email:    Mail,
    linkedin: LinkedinIcon,
    instagram: Instagram,
    phone:    Phone,
    IRL:      MapPin,
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
}

function truncateText(value: string, limit: number) {
    if (value.length <= limit) return value;
    return `${value.slice(0, limit).trim()}…`;
}

// --- Stage picker ---
function StagePicker({
    visibleStages, messageCounts, currentStatus, selectedStage, onSelect,
}: {
    visibleStages: OpportunityStatus[];
    messageCounts: Record<string, number>;
    currentStatus: OpportunityStatus;
    selectedStage: OpportunityStatus;
    onSelect: (stage: OpportunityStatus) => void;
}) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {visibleStages.map((stage) => {
                const count = messageCounts[stage] ?? 0;
                const isSelected = selectedStage === stage;
                const isCurrent = stage === currentStatus;
                const styles = STAGE_PILL_STYLES[stage];

                return (
                    <button
                        key={stage}
                        onClick={() => onSelect(stage)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 border",
                            isSelected
                                ? "text-white border-transparent shadow-sm"
                                : cn("border-transparent hover:border-border", styles.bg, styles.text)
                        )}
                        style={isSelected ? { backgroundColor: "var(--brand-secondary, #6366F1)" } : undefined}
                    >
                        {isCurrent && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        {mapOpportunityStatusLabel[stage]}
                        {count > 0 && (
                            <span className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                isSelected ? "bg-white/25 text-white" : "bg-white/60 text-inherit"
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// --- History section ---
function MessageHistory({
    messages, onLoad,
}: {
    messages: AIMessageRow[];
    onLoad: (msg: AIMessageRow) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (messages.length === 0) return null;

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-base leading-none">◷</span>
                    <span>
                        Historique — {messages.length} message{messages.length > 1 ? "s" : ""}
                    </span>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                )} />
            </button>

            {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                    {messages.map((msg) => {
                        const Icon = CHANNEL_ICONS[msg.channel] ?? Mail;
                        const statusStyles = msg.opportunity_status
                            ? STAGE_PILL_STYLES[msg.opportunity_status as OpportunityStatus]
                            : null;
                        return (
                            <div key={msg.id} className="p-4 flex items-start gap-3 hover:bg-muted transition-colors">
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {msg.subject && (
                                        <p className="text-sm font-medium text-foreground truncate mb-0.5">
                                            {msg.subject}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {msg.body}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                        {msg.opportunity_status && statusStyles && (
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                statusStyles.bg, statusStyles.text
                                            )}>
                                                {mapOpportunityStatusLabel[msg.opportunity_status as OpportunityStatus]}
                                            </span>
                                        )}
                                        <Badge variant="outline" className="text-[10px] py-0">{msg.channel}</Badge>
                                        <Badge variant="outline" className="text-[10px] py-0">{msg.tone}</Badge>
                                        <span className="text-[10px] text-muted-foreground">{formatDate(msg.created_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost" size="sm" className="h-7 w-7 p-0"
                                        onClick={() => {
                                            const text = msg.subject ? `${msg.subject}\n\n${msg.body}` : msg.body;
                                            navigator.clipboard.writeText(text);
                                            toast.success("Copié !");
                                        }}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm"
                                        className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                        onClick={() => onLoad(msg)}
                                    >
                                        Charger
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Main component ---

export function AIMessageGenerator({
    opportunity,
    allMessages: initialMessages,
}: {
    opportunity: OpportunityAIContext;
    allMessages: AIMessageRow[];
}) {
    const { profile } = useUserProfile();
    const { agency } = useAgency();
    const refForm = useRef<HTMLFormElement>(null);
    const [allMessages, setAllMessages] = useState<AIMessageRow[]>(initialMessages);

    const getLatestMessageForStage = (
        stage: OpportunityStatus,
        messages: AIMessageRow[]
    ): AIMessageRow | null =>
        messages
            .filter((message) => message.opportunity_status === stage)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;

    const initialStageMessage = getLatestMessageForStage(
        opportunity.status as OpportunityStatus,
        initialMessages
    );

    const [selectedStage, setSelectedStage] = useState<OpportunityStatus>(
        opportunity.status as OpportunityStatus
    );

    // Editor
    const [editedSubject, setEditedSubject] = useState(initialStageMessage?.subject || "");
    const [editedBody, setEditedBody] = useState(initialStageMessage?.body || "");
    const [messageId, setMessageId] = useState<string | null>(initialStageMessage?.id ?? null);
    const [isSaved, setIsSaved] = useState(Boolean(initialStageMessage));
    const [savedSubject, setSavedSubject] = useState(initialStageMessage?.subject || "");
    const [savedBody, setSavedBody] = useState(initialStageMessage?.body || "");

    // Config
    const [selectedChannel, setSelectedChannel] = useState<ContactVia>(
        ((initialStageMessage?.channel as ContactVia | undefined) ?? (opportunity.contact_via as ContactVia)) || "email"
    );
    const [tone, setTone] = useState(initialStageMessage?.tone ?? "friendly");
    const [length, setLength] = useState(initialStageMessage?.length ?? "medium");
    const [customContext, setCustomContext] = useState(initialStageMessage?.custom_context || "");
    const [hasTrackingLink, setHasTrackingLink] = useState(false);
    const [isCreatingTrackingLink, startTrackingLinkCreation] = useTransition();

    // Generation
    const [isPending, startTransition] = useTransition();
    const [generationError, setGenerationError] = useState<string | null>(null);

    const loadTrackingLinkState = async () => {
        const result = await getTrackingLinks(opportunity.id);
        if (result.success && result.data) {
            setHasTrackingLink(result.data.some((link: LinkRecord) => link.is_active));
        }
    };

    useEffect(() => {
        let cancelled = false;

        getTrackingLinks(opportunity.id).then((result) => {
            if (!cancelled && result.success && result.data) {
                setHasTrackingLink(result.data.some((link: LinkRecord) => link.is_active));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [opportunity.id]);

    const hasUnsavedChanges = !!messageId && (editedSubject !== savedSubject || editedBody !== savedBody);
    const canSave = !!editedBody && (!messageId || hasUnsavedChanges);

    // Stage pills: show stages with messages + current opportunity stage
    const { visibleStages, messageCounts } = useMemo(() => {
        const counts: Record<string, number> = {};
        allMessages.forEach((m) => {
            if (m.opportunity_status) counts[m.opportunity_status] = (counts[m.opportunity_status] || 0) + 1;
        });
        const stages = PIPELINE_ORDER.filter((s) => counts[s] > 0 || s === opportunity.status);
        return { visibleStages: stages, messageCounts: counts };
    }, [allMessages, opportunity.status]);

    const loadStageMessage = (stage: OpportunityStatus) => {
        const latest = getLatestMessageForStage(stage, allMessages);

        if (latest) {
            setEditedSubject(latest.subject || "");
            setEditedBody(latest.body);
            setSavedSubject(latest.subject || "");
            setSavedBody(latest.body);
            setMessageId(latest.id);
            setIsSaved(true);
            setSelectedChannel(latest.channel as ContactVia);
            setTone(latest.tone);
            setLength(latest.length);
            setCustomContext(latest.custom_context || "");
        } else {
            setEditedSubject("");
            setEditedBody("");
            setSavedSubject("");
            setSavedBody("");
            setMessageId(null);
            setIsSaved(false);
        }

        setGenerationError(null);
    };

    const handleSelectStage = (stage: OpportunityStatus) => {
        setSelectedStage(stage);
        loadStageMessage(stage);
    };

    const handleLoadMessage = (msg: AIMessageRow) => {
        setEditedSubject(msg.subject || "");
        setEditedBody(msg.body);
        setSavedSubject(msg.subject || "");
        setSavedBody(msg.body);
        setMessageId(msg.id);
        setIsSaved(true);
        setSelectedChannel(msg.channel as ContactVia);
        setTone(msg.tone);
        setLength(msg.length);
        setCustomContext(msg.custom_context || "");
    };

    const handleGenerate = () => {
        if (!refForm.current) return;
        setGenerationError(null);
        setIsSaved(false);
        setMessageId(null);

        startTransition(async () => {
            const formData = new FormData(refForm.current as HTMLFormElement);
            // Use selectedStage as the status context for generation
            formData.set("opportunity", JSON.stringify({ ...opportunity, status: selectedStage }));
            formData.set("persist", "false");

            try {
                const result = await generateOpportunityMessage(null, formData, profile?.agency_id);

                if (result.error || !result.body) {
                    setGenerationError(result.error || "Erreur de génération");
                    toast.error(result.error || "Erreur de génération");
                    return;
                }

                setEditedSubject(result.subject || "");
                setEditedBody(result.body);
                setSavedSubject("");
                setSavedBody("");
                setMessageId(null);
                setIsSaved(false);

                posthog.capture("ai_message_generated", {
                    opportunity_id: opportunity.id,
                    channel: selectedChannel,
                    tone,
                    length,
                    stage: selectedStage,
                });
                toast.success("Message généré !");
            } catch {
                setGenerationError("Erreur lors de la génération");
                toast.error("Erreur lors de la génération");
            }
        });
    };

    const handleSave = async () => {
        if (!editedBody) return;

        if (!messageId) {
            const result = await saveAIGeneratedMessage({
                opportunityId: opportunity.id,
                agencyId: profile?.agency_id ?? undefined,
                opportunityStatus: selectedStage,
                channel: selectedChannel,
                tone,
                length,
                customContext: customContext || undefined,
                subject: editedSubject || undefined,
                body: editedBody,
            });

            if (result.success && result.data) {
                const saved = result.data as AIMessageRow;
                setMessageId(saved.id);
                setSavedSubject(saved.subject || "");
                setSavedBody(saved.body);
                setIsSaved(true);
                setAllMessages((prev) => [saved, ...prev]);
                toast.success("Message sauvegardé !");
                return;
            }

            toast.error("Erreur lors de la sauvegarde");
            return;
        }

        const result = await updateAIGeneratedMessage(messageId, {
            subject: editedSubject || undefined,
            body: editedBody,
        });
        if (result.success) {
            setSavedSubject(editedSubject);
            setSavedBody(editedBody);
            setIsSaved(true);
            setAllMessages((prev) =>
                prev.map((m) => m.id === messageId ? { ...m, subject: editedSubject || null, body: editedBody } : m)
            );
            toast.success("Message mis à jour !");
        } else {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const copyToClipboard = () => {
        const text = editedSubject ? `${editedSubject}\n\n${editedBody}` : editedBody;
        navigator.clipboard.writeText(text);
        posthog.capture("ai_message_copied", { opportunity_id: opportunity.id, channel: selectedChannel });
        toast.success("Copié !");
    };

    const handleCreateTrackingLink = () => {
        if (!profile?.agency_id) {
            toast.error("Agence introuvable");
            return;
        }

        const website = agency?.website;

        if (!website) {
            toast.error("Ajoutez d'abord le site web de l'agence pour générer un lien de tracking");
            return;
        }

        startTrackingLinkCreation(async () => {
            const result = await createTrackingLink({
                opportunityId: opportunity.id,
                agencyId: profile.agency_id,
                originalUrl: website,
                campaignName: `Email ${mapOpportunityStatusLabel[selectedStage]}`,
            });

            if (result.success) {
                await loadTrackingLinkState();
                toast.success("Lien de tracking généré");
                return;
            }

            toast.error(result.error ?? "Erreur lors de la création du lien");
        });
    };

    const toggleClass = (isSelected: boolean) =>
        `px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
            : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted"
        }`;

    const channelOptions = [
        { value: "email",     label: "Email",       icon: Mail },
        { value: "linkedin",  label: "LinkedIn",    icon: LinkedinIcon },
        { value: "instagram", label: "Instagram",   icon: Instagram },
        { value: "phone",     label: "Téléphone",   icon: Phone },
        { value: "IRL",       label: "En personne", icon: MapPin },
    ];
    const toneOptions    = [{ value: "formal", label: "Formel" }, { value: "friendly", label: "Aimable" }, { value: "casual", label: "Décontracté" }];
    const lengthOptions  = [{ value: "short", label: "Court" }, { value: "medium", label: "Moyen" }];

    const hasBody    = !!editedBody;
    const stageLabel = mapOpportunityStatusLabel[selectedStage];
    const descriptionPreview = opportunity.description?.trim() || "";
    const shortDescriptionPreview = descriptionPreview ? truncateText(descriptionPreview, 180) : "";
    const latestHistory = allMessages
        .filter((m) => m.id !== messageId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="flex flex-col gap-4 h-full">
            {generationError && (
                <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Erreur de génération</p>
                            <p className="mt-0.5 text-sm">{generationError}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                    <Card className="border-border/70 shadow-sm">
                        <CardContent className="p-4">
                            <form ref={refForm} onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-4">
                                <input type="hidden" name="opportunity" value={JSON.stringify(opportunity)} />
                                <input type="hidden" name="channel" value={selectedChannel} />
                                <input type="hidden" name="tone" value={tone} />
                                <input type="hidden" name="length" value={length} />
                                <input type="hidden" name="customContext" value={customContext} />

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Message</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {opportunity.company?.name ?? "Cette opportunité"} · {stageLabel}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {hasBody && !isPending && (
                                                    <Button type="button" variant="outline" size="sm" onClick={copyToClipboard} className="rounded-xl">
                                                        <Copy className="mr-1.5 h-3.5 w-3.5" />Copier
                                                    </Button>
                                                )}
                                                <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={isPending} className="rounded-xl">
                                                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />Régénérer
                                                </Button>
                                                {canSave ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleSave}
                                                        className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
                                                    >
                                                        <Save className="mr-1.5 h-3.5 w-3.5" />Enregistrer
                                                    </Button>
                                                ) : (
                                                    <Badge className={cn(
                                                        "rounded-xl px-3 py-1 text-[11px] font-medium",
                                                        isSaved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {isSaved ? "Sauvegardé" : "Non sauvegardé"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <StagePicker
                                            visibleStages={visibleStages}
                                            messageCounts={messageCounts}
                                            currentStatus={opportunity.status as OpportunityStatus}
                                            selectedStage={selectedStage}
                                            onSelect={handleSelectStage}
                                        />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                        <div>
                                        <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Canal
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {channelOptions.map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setSelectedChannel(value as ContactVia)}
                                                    className={cn(toggleClass(selectedChannel === value), "inline-flex items-center gap-2")}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    <span>{label}</span>
                                                </button>
                                            ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                Ton
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {toneOptions.map(({ value, label }) => (
                                                    <button key={value} type="button" onClick={() => setTone(value)} className={toggleClass(tone === value)}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                Longueur
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {lengthOptions.map(({ value, label }) => (
                                                    <button key={value} type="button" onClick={() => setLength(value)} className={toggleClass(length === value)}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedChannel === "email" && (
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                Objet
                                            </Label>
                                            <input
                                                type="text"
                                                value={editedSubject}
                                                onChange={(e) => setEditedSubject(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Corps du message
                                        </Label>
                                        {isPending ? (
                                            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
                                                <div className="space-y-3 text-center">
                                                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground">Le brouillon se construit…</p>
                                                </div>
                                            </div>
                                        ) : !hasBody ? (
                                            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8">
                                                <div className="max-w-sm space-y-3 text-center">
                                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm">
                                                        <Wand2 className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-base font-medium text-foreground">Lancez une première version</p>
                                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                                        Générez un brouillon pour « {stageLabel} », puis ajustez-le directement ici.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={editedBody}
                                                onChange={(e) => setEditedBody(e.target.value)}
                                                className="min-h-[620px] resize-none rounded-2xl border border-border bg-background px-4 py-4 text-[15px] leading-7 text-foreground"
                                            />
                                        )}
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="border-border/70 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Contexte</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Notes pour l’IA
                                </Label>
                                <Textarea
                                    value={customContext}
                                    onChange={(e) => setCustomContext(e.target.value)}
                                    placeholder={`Ajoutez un angle, une contrainte ou un détail pour « ${stageLabel} »...`}
                                    className="min-h-[124px] resize-none rounded-xl border-border/70 text-sm"
                                />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Description
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {shortDescriptionPreview
                                        ? shortDescriptionPreview
                                        : "Ajoutez une description d’opportunité pour guider l’observation centrale du message."}
                                </p>
                            </div>

                            {hasTrackingLink && (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    <Link2 className="h-4 w-4 shrink-0" />
                                    Lien de tracking prêt
                                </div>
                            )}

                            {!hasTrackingLink && (
                                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3">
                                    <p className="text-sm font-medium text-foreground">
                                        Ajouter un lien de tracking
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Générez un lien actif pour l'inclure automatiquement dans l'email.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 rounded-xl"
                                        onClick={handleCreateTrackingLink}
                                        disabled={isCreatingTrackingLink}
                                    >
                                        {isCreatingTrackingLink ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Générer un lien de tracking
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <MessageHistory
                        messages={latestHistory}
                        onLoad={handleLoadMessage}
                    />
                </div>
            </div>

        </div>
    );
}
