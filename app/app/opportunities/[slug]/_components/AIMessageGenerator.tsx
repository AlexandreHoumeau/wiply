"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import {
    AlertCircle, CheckCircle2, ChevronDown, Copy, Instagram,
    Link2, LinkedinIcon, Loader2, Mail, Phone, MapPin, Save, Wand2,
} from "lucide-react";

import { generateOpportunityMessage, updateAIGeneratedMessage, AIMessageRow } from "@/actions/ai-messages";
import { getTrackingLinks } from "@/actions/tracking.server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OpportunityAIContext } from "@/lib/email_generator/utils";
import { ContactVia, OpportunityStatus, mapOpportunityStatusLabel } from "@/lib/validators/oppotunities";
import { cn } from "@/lib/utils";

// --- Pipeline order for stage pills ---
const PIPELINE_ORDER: OpportunityStatus[] = [
    "to_do", "first_contact", "second_contact", "proposal_sent", "negotiation", "won", "lost",
];

const STAGE_PILL_STYLES: Record<OpportunityStatus, { bg: string; text: string }> = {
    to_do:          { bg: "bg-slate-100",  text: "text-slate-600" },
    first_contact:  { bg: "bg-blue-50",    text: "text-blue-700" },
    second_contact: { bg: "bg-indigo-50",  text: "text-indigo-700" },
    proposal_sent:  { bg: "bg-amber-50",   text: "text-amber-700" },
    negotiation:    { bg: "bg-violet-50",  text: "text-violet-700" },
    won:            { bg: "bg-emerald-50", text: "text-emerald-700" },
    lost:           { bg: "bg-red-50",     text: "text-red-600" },
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
                                : cn("border-transparent hover:border-slate-200", styles.bg, styles.text)
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
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-base leading-none">◷</span>
                    <span>
                        Historique — {messages.length} message{messages.length > 1 ? "s" : ""}
                    </span>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform duration-200",
                    isExpanded && "rotate-180"
                )} />
            </button>

            {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {messages.map((msg) => {
                        const Icon = CHANNEL_ICONS[msg.channel] ?? Mail;
                        const statusStyles = msg.opportunity_status
                            ? STAGE_PILL_STYLES[msg.opportunity_status as OpportunityStatus]
                            : null;
                        return (
                            <div key={msg.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="h-3.5 w-3.5 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {msg.subject && (
                                        <p className="text-sm font-medium text-gray-900 truncate mb-0.5">
                                            {msg.subject}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
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
                                        <span className="text-[10px] text-gray-400">{formatDate(msg.created_at)}</span>
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
                                        className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
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
    const refForm = useRef<HTMLFormElement>(null);
    const allMessagesRef = useRef<AIMessageRow[]>(initialMessages);

    const [allMessages, setAllMessages] = useState<AIMessageRow[]>(initialMessages);
    const [selectedStage, setSelectedStage] = useState<OpportunityStatus>(
        opportunity.status as OpportunityStatus
    );

    // Editor
    const [editedSubject, setEditedSubject] = useState("");
    const [editedBody, setEditedBody] = useState("");
    const [messageId, setMessageId] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [savedSubject, setSavedSubject] = useState("");
    const [savedBody, setSavedBody] = useState("");

    // Config
    const [selectedChannel, setSelectedChannel] = useState<ContactVia>(
        (opportunity.contact_via as ContactVia) || "email"
    );
    const [tone, setTone] = useState("friendly");
    const [length, setLength] = useState("medium");
    const [customContext, setCustomContext] = useState("");
    const [hasTrackingLink, setHasTrackingLink] = useState(false);

    // Generation
    const [isPending, startTransition] = useTransition();
    const [generationError, setGenerationError] = useState<string | null>(null);

    useEffect(() => { allMessagesRef.current = allMessages; }, [allMessages]);

    useEffect(() => {
        getTrackingLinks(opportunity.id).then((result) => {
            if (result.success && result.data) {
                setHasTrackingLink(result.data.some((l: any) => l.is_active));
            }
        });
    }, [opportunity.id]);

    // Load latest message when stage changes (uses ref to avoid stale closure)
    useEffect(() => {
        const msgs = allMessagesRef.current
            .filter((m) => m.opportunity_status === selectedStage)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (msgs.length > 0) {
            const latest = msgs[0];
            setEditedSubject(latest.subject || "");
            setEditedBody(latest.body);
            setSavedSubject(latest.subject || "");
            setSavedBody(latest.body);
            setMessageId(latest.id);
            setIsSaved(true);
            setHasUnsavedChanges(false);
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
            setHasUnsavedChanges(false);
        }
        setGenerationError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStage]);

    // Detect unsaved changes
    useEffect(() => {
        if (isSaved && messageId) {
            setHasUnsavedChanges(editedSubject !== savedSubject || editedBody !== savedBody);
        }
    }, [editedSubject, editedBody, isSaved, messageId, savedSubject, savedBody]);

    // Stage pills: show stages with messages + current opportunity stage
    const { visibleStages, messageCounts } = useMemo(() => {
        const counts: Record<string, number> = {};
        allMessages.forEach((m) => {
            if (m.opportunity_status) counts[m.opportunity_status] = (counts[m.opportunity_status] || 0) + 1;
        });
        const stages = PIPELINE_ORDER.filter((s) => counts[s] > 0 || s === opportunity.status);
        return { visibleStages: stages, messageCounts: counts };
    }, [allMessages, opportunity.status]);

    // All messages for selected stage sorted newest-first
    const stageMessages = useMemo(
        () => allMessages
            .filter((m) => m.opportunity_status === selectedStage)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [allMessages, selectedStage]
    );

    const handleLoadMessage = (msg: AIMessageRow) => {
        setEditedSubject(msg.subject || "");
        setEditedBody(msg.body);
        setSavedSubject(msg.subject || "");
        setSavedBody(msg.body);
        setMessageId(msg.id);
        setIsSaved(true);
        setHasUnsavedChanges(false);
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

            try {
                const result = await generateOpportunityMessage(null, formData, profile?.agency_id);

                if (result.error || !result.body) {
                    setGenerationError(result.error || "Erreur de génération");
                    toast.error(result.error || "Erreur de génération");
                    return;
                }

                setEditedSubject(result.subject || "");
                setEditedBody(result.body);
                setSavedSubject(result.subject || "");
                setSavedBody(result.body);
                setMessageId(result.id);
                setIsSaved(true);
                setHasUnsavedChanges(false);

                if (result.id) {
                    const newMsg: AIMessageRow = {
                        id: result.id,
                        opportunity_id: opportunity.id,
                        agency_id: profile?.agency_id ?? null,
                        opportunity_status: selectedStage,
                        channel: selectedChannel,
                        tone,
                        length,
                        custom_context: customContext || null,
                        subject: result.subject,
                        body: result.body,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    setAllMessages((prev) => [newMsg, ...prev]);
                }

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

    const handleUpdate = async () => {
        if (!messageId) return;
        const result = await updateAIGeneratedMessage(messageId, {
            subject: editedSubject || undefined,
            body: editedBody,
        });
        if (result.success) {
            setSavedSubject(editedSubject);
            setSavedBody(editedBody);
            setHasUnsavedChanges(false);
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

    const toggleClass = (isSelected: boolean) =>
        `px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${isSelected
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
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

    return (
        <div className="flex flex-col gap-3 h-full">

            {/* STAGE PICKER */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                    Message pour le statut
                </p>
                <StagePicker
                    visibleStages={visibleStages}
                    messageCounts={messageCounts}
                    currentStatus={opportunity.status as OpportunityStatus}
                    selectedStage={selectedStage}
                    onSelect={setSelectedStage}
                />
            </div>

            {/* CONFIG TOOLBAR */}
            <Card className="border border-gray-200 shadow-sm shrink-0">
                <CardContent className="py-3 px-4">
                    <form ref={refForm} onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
                        <input type="hidden" name="opportunity" value={JSON.stringify(opportunity)} />
                        <input type="hidden" name="channel" value={selectedChannel} />
                        <input type="hidden" name="tone" value={tone} />
                        <input type="hidden" name="length" value={length} />
                        <input type="hidden" name="customContext" value={customContext} />

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-1 flex-wrap">
                                {channelOptions.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value} type="button"
                                        onClick={() => setSelectedChannel(value as ContactVia)}
                                        className={`flex items-center gap-1.5 ${toggleClass(selectedChannel === value)}`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />{label}
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-5 bg-gray-200 shrink-0" />

                            <div className="flex gap-1">
                                {toneOptions.map(({ value, label }) => (
                                    <button key={value} type="button" onClick={() => setTone(value)} className={toggleClass(tone === value)}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-5 bg-gray-200 shrink-0" />

                            <div className="flex gap-1">
                                {lengthOptions.map(({ value, label }) => (
                                    <button key={value} type="button" onClick={() => setLength(value)} className={toggleClass(length === value)}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1" />

                            <Button type="submit" disabled={isPending} size="sm">
                                {isPending
                                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Génération...</>
                                    : <><Wand2 className="mr-1.5 h-3.5 w-3.5" />{messageId ? "Régénérer" : "Générer"}</>
                                }
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 mt-2.5">
                            <Textarea
                                value={customContext}
                                onChange={(e) => setCustomContext(e.target.value)}
                                placeholder={`Contexte additionnel pour « ${stageLabel} » (optionnel)...`}
                                className="flex-1 h-[34px] min-h-0 resize-none text-xs py-2"
                            />
                            {hasTrackingLink && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-2 whitespace-nowrap shrink-0">
                                    <Link2 className="h-3 w-3 flex-shrink-0" />
                                    Tracking inclus
                                </div>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Error */}
            {generationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 shrink-0">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-sm text-red-900">Erreur</p>
                        <p className="text-sm text-red-700 mt-0.5">{generationError}</p>
                    </div>
                </div>
            )}

            {/* GENERATED MESSAGE */}
            <Card className="flex-1 flex flex-col min-h-0 border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-900">
                                    Message — {stageLabel}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500">
                                    {isPending ? "Génération en cours..." : hasBody ? "Modifiez et envoyez" : "En attente de génération"}
                                </CardDescription>
                            </div>
                        </div>
                        {hasBody && !isPending && (
                            <Button variant="outline" size="sm" onClick={copyToClipboard} className="text-gray-600">
                                <Copy className="mr-1.5 h-3.5 w-3.5" />Copier
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0 pt-4">
                    {isPending ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="space-y-3 text-center">
                                <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
                                <p className="text-gray-500 text-sm">Génération du message...</p>
                            </div>
                        </div>
                    ) : !hasBody ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="space-y-3 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <Wand2 className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 text-sm">
                                    Aucun message pour « {stageLabel} » — cliquez sur Générer
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {selectedChannel === "email" && (
                                <div className="space-y-1.5 mb-3 shrink-0">
                                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                        Sujet
                                    </Label>
                                    <input
                                        type="text"
                                        value={editedSubject}
                                        onChange={(e) => setEditedSubject(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}

                            <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
                                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide shrink-0">
                                    Message
                                </Label>
                                <Textarea
                                    value={editedBody}
                                    onChange={(e) => setEditedBody(e.target.value)}
                                    className="flex-1 min-h-[200px] resize-none text-sm leading-relaxed"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 mt-3 flex items-center gap-2 shrink-0 flex-wrap">
                                <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={isPending}>
                                    <Wand2 className="h-4 w-4 mr-1.5" />Régénérer
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={copyToClipboard}>
                                    <Copy className="h-4 w-4 mr-1.5" />Copier
                                </Button>

                                {hasUnsavedChanges && messageId ? (
                                    <Button
                                        type="button" variant="outline" size="sm" onClick={handleUpdate}
                                        className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
                                    >
                                        <Save className="h-4 w-4 mr-1.5" />Enregistrer
                                    </Button>
                                ) : (
                                    <Button
                                        type="button" variant="outline" size="sm" disabled={!isSaved}
                                        className={isSaved ? "text-green-600 border-green-200 bg-green-50" : ""}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        {isSaved ? "Sauvegardé" : "Non sauvegardé"}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* HISTORY — all messages except the currently loaded one, newest first */}
            <MessageHistory
                messages={allMessages
                    .filter((m) => m.id !== messageId)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
                onLoad={handleLoadMessage}
            />
        </div>
    );
}
