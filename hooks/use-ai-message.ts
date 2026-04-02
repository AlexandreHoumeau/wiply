"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { generateOpportunityMessage, getAIGeneratedMessages, saveAIGeneratedMessage, updateAIGeneratedMessage } from "@/actions/ai-messages";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OpportunityAIContext } from "@/lib/email_generator/utils";
import { ContactVia } from "@/lib/validators/oppotunities";

export function useAIMessage(opportunity: OpportunityAIContext) {
    const { profile } = useUserProfile();
    const [selectedChannel, setSelectedChannel] = useState<ContactVia>(opportunity.contact_via || "email");
    const [tone, setTone] = useState("friendly");
    const [length, setLength] = useState("medium");
    const [customContext, setCustomContext] = useState("");
    const [state, setState] = useState({ subject: null as string | null, body: null as string | null, error: null as string | undefined | null });
    const [editedSubject, setEditedSubject] = useState("");
    const [editedBody, setEditedBody] = useState("");
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [messageId, setMessageId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const result = await getAIGeneratedMessages(opportunity.id);
            if (result.success && result.data?.length > 0) {
                const msg = result.data[0];
                setState({ subject: msg.subject, body: msg.body, error: null });
                setEditedSubject(msg.subject || "");
                setEditedBody(msg.body);
                setMessageId(msg.id);
                setIsSaved(true);
                setSelectedChannel(msg.channel as ContactVia);
                setTone(msg.tone);
                setLength(msg.length);
                setCustomContext(msg.custom_context || "");
            }
            setIsLoading(false);
        };
        load();
    }, [opportunity.id]);

    const hasUnsavedChanges = Boolean(
        messageId &&
        (editedSubject !== (state.subject || "") || editedBody !== (state.body || ""))
    );

    const handleGenerate = () => {
        setIsSaved(false);
        setMessageId(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('opportunity', JSON.stringify(opportunity));
            formData.append('channel', selectedChannel);
            formData.append('tone', tone);
            formData.append('length', length);
            formData.append('customContext', customContext);
            formData.append('persist', 'false');
            try {
                const result = await generateOpportunityMessage(null, formData, profile?.agency_id);
                if (result.error || !result.body) {
                    setState({ subject: null, body: null, error: result.error });
                    return;
                }
                setState({ subject: result.subject || null, body: result.body, error: null });
                setEditedSubject(result.subject || "");
                setEditedBody(result.body || "");
                setMessageId(null);
                setIsSaved(false);
            } catch {
                setState({ subject: null, body: null, error: "Erreur génération" });
            }
        });
    };

    const handleUpdate = async () => {
        if (!messageId) {
            const result = await saveAIGeneratedMessage({
                opportunityId: opportunity.id,
                agencyId: profile?.agency_id ?? undefined,
                opportunityStatus: opportunity.status,
                channel: selectedChannel,
                tone,
                length,
                customContext: customContext || undefined,
                subject: editedSubject || undefined,
                body: editedBody,
            });

            if (result.success && result.data) {
                const msg = result.data;
                setState({ subject: msg.subject, body: msg.body, error: null });
                setEditedSubject(msg.subject || "");
                setEditedBody(msg.body);
                setMessageId(msg.id);
                setIsSaved(true);
                toast.success("Sauvegardé");
            }
            return;
        }

        const result = await updateAIGeneratedMessage(messageId, { subject: editedSubject, body: editedBody });
        if (result.success) {
            setState(prev => ({ ...prev, subject: editedSubject, body: editedBody }));
            setIsSaved(true);
            toast.success("Mis à jour");
        }
    };

    return {
        selectedChannel, setSelectedChannel, tone, setTone, length, setLength,
        customContext, setCustomContext, state, editedSubject, setEditedSubject,
        editedBody, setEditedBody, isPending, isLoading, isSaved, hasUnsavedChanges,
        messageId, handleGenerate, handleUpdate
    };
}
