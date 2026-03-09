"use client";
import { generateOpportunityMessage, getAIGeneratedMessages, saveAIGeneratedMessage, updateAIGeneratedMessage } from "@/actions/ai-messages";
import { getTrackingLinks } from "@/actions/tracking.server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OpportunityAIContext } from "@/lib/email_generator/utils";
import { ContactVia } from "@/lib/validators/oppotunities";
import { AlertCircle, CheckCircle2, Copy, Instagram, Link2, LinkedinIcon, Loader2, Mail, Save, Wand2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";

export function AIMessageGenerator({ opportunity }: { opportunity: OpportunityAIContext }) {
	const { profile } = useUserProfile();
	const refForm = useRef<HTMLFormElement>(null);
	const [state, setState] = useState({
		subject: null as string | null,
		body: null as string | null,
		error: null as string | undefined | null,
		id: null as string | null,
	});
	const [isPending, startTransition] = useTransition();
	const [customContext, setCustomContext] = useState("");
	const [selectedChannel, setSelectedChannel] = useState(opportunity.contact_via || "email");
	const [tone, setTone] = useState("friendly");
	const [length, setLength] = useState("medium");

	const [editedSubject, setEditedSubject] = useState("");
	const [editedBody, setEditedBody] = useState("");
	const [isSaved, setIsSaved] = useState(false);
	const [messageId, setMessageId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [hasTrackingLink, setHasTrackingLink] = useState(false);

	useEffect(() => {
		loadExistingMessage();
		getTrackingLinks(opportunity.id).then(result => {
			if (result.success && result.data) {
				setHasTrackingLink(result.data.some((l: any) => l.is_active));
			}
		});
	}, [opportunity.id]);

	const loadExistingMessage = async () => {
		setIsLoading(true);
		const result = await getAIGeneratedMessages(opportunity.id);

		if (result.success && result.data && result.data.length > 0) {
			const latestMessage = result.data[0];
			setState({
				subject: latestMessage.subject,
				body: latestMessage.body,
				error: null,
				id: latestMessage.id,
			});
			setEditedSubject(latestMessage.subject || "");
			setEditedBody(latestMessage.body);
			setMessageId(latestMessage.id);
			setIsSaved(true);
			setSelectedChannel(latestMessage.channel as ContactVia);
			setTone(latestMessage.tone);
			setLength(latestMessage.length);
			setCustomContext(latestMessage.custom_context || "");
		}

		setIsLoading(false);
	};

	useEffect(() => {
		if (state.body && !isSaved && !messageId) {
			handleSaveMessage();
		}
	}, [state.body, isSaved, messageId]);

	const handleSaveMessage = async () => {
		if (!state.body) return;

		const result = await saveAIGeneratedMessage({
			opportunityId: opportunity.id,
			channel: selectedChannel,
			tone,
			length,
			customContext,
			subject: state.subject || undefined,
			body: state.body,
		});

		if (result.success && result.data) {
			setIsSaved(true);
			setMessageId(result.data.id);
			setHasUnsavedChanges(false);
			toast.success("Message sauvegardé !");
		}
	};

	const handleUpdateMessage = async () => {
		if (!messageId) return;

		const result = await updateAIGeneratedMessage(messageId, {
			subject: editedSubject || undefined,
			body: editedBody,
		});

		if (result.success) {
			setHasUnsavedChanges(false);
			toast.success("Message mis à jour !");
		} else {
			toast.error("Erreur lors de la mise à jour");
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleGenerate();
	};

	const handleGenerate = async () => {
		if (!refForm.current) return;

		setIsSaved(false);
		setMessageId(null);

		startTransition(async () => {
			const formData = new FormData(refForm.current as HTMLFormElement);

			try {
				const result = await generateOpportunityMessage(null, formData, profile?.agency_id);

				if (result.error || !result.body) {
					setState({ subject: null, body: null, error: result.error, id: null });
					toast.error(result.error || "Erreur de génération");
					return;
				}

				setState({ ...result, error: null });
				setEditedSubject(result.subject || "");
				setEditedBody(result.body || "");
				setHasUnsavedChanges(false);
				posthog.capture("ai_message_generated", {
					opportunity_id: opportunity.id,
					channel: selectedChannel,
					tone,
					length,
				});
				toast.success("Message généré avec succès!");
			} catch {
				setState({ subject: null, body: null, error: "Erreur lors de la génération", id: null });
				toast.error("Erreur lors de la génération");
			}
		});
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		posthog.capture("ai_message_copied", {
			opportunity_id: opportunity.id,
			channel: selectedChannel,
		});
		toast.success("Copié !");
	};

	useEffect(() => {
		if (isSaved && messageId) {
			const hasChanged =
				editedSubject !== (state.subject || "") ||
				editedBody !== (state.body || "");
			setHasUnsavedChanges(hasChanged);
		}
	}, [editedSubject, editedBody]);

	const channelOptions = [
		{ value: "email", label: "Email", icon: Mail },
		{ value: "linkedin", label: "LinkedIn", icon: LinkedinIcon },
		{ value: "instagram", label: "Instagram", icon: Instagram },
	];

	const toneOptions = [
		{ value: "formal", label: "Formel" },
		{ value: "friendly", label: "Aimable" },
		{ value: "casual", label: "Décontracté" },
	];

	const lengthOptions = [
		{ value: "short", label: "Court" },
		{ value: "medium", label: "Moyen" },
	];

	const toggleClass = (isSelected: boolean) =>
		`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${isSelected
			? "border-blue-500 bg-blue-50 text-blue-700"
			: "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
		}`;

	return (
		<div className="flex flex-col gap-3 h-full">
			{/* COMPACT CONFIG TOOLBAR */}
			<Card className="border border-gray-200 shadow-sm shrink-0">
				<CardContent className="py-3 px-4">
					<form ref={refForm} onSubmit={handleSubmit}>
						<input type="hidden" name="opportunity" value={JSON.stringify(opportunity)} />
						<input type="hidden" name="channel" value={selectedChannel} />
						<input type="hidden" name="tone" value={tone} />
						<input type="hidden" name="length" value={length} />
						<input type="hidden" name="customContext" value={customContext} />

						{/* Controls row */}
						<div className="flex flex-wrap items-center gap-2">
							{/* Channel */}
							<div className="flex gap-1">
								{channelOptions.map((option) => {
									const Icon = option.icon;
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => setSelectedChannel(option.value as ContactVia)}
											className={`flex items-center gap-1.5 ${toggleClass(selectedChannel === option.value)}`}
										>
											<Icon className="h-3.5 w-3.5" />
											{option.label}
										</button>
									);
								})}
							</div>

							<div className="w-px h-5 bg-gray-200 shrink-0" />

							{/* Tone */}
							<div className="flex gap-1">
								{toneOptions.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => setTone(option.value)}
										className={toggleClass(tone === option.value)}
									>
										{option.label}
									</button>
								))}
							</div>

							<div className="w-px h-5 bg-gray-200 shrink-0" />

							{/* Length */}
							<div className="flex gap-1">
								{lengthOptions.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => setLength(option.value)}
										className={toggleClass(length === option.value)}
									>
										{option.label}
									</button>
								))}
							</div>

							<div className="flex-1" />

							{/* Generate */}
							<Button type="submit" disabled={isPending} size="sm">
								{isPending ? (
									<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Génération...</>
								) : (
									<><Wand2 className="mr-1.5 h-3.5 w-3.5" />{messageId ? "Régénérer" : "Générer"}</>
								)}
							</Button>
						</div>

						{/* Context + tracking row */}
						<div className="flex items-center gap-2 mt-2.5">
							<Textarea
								id="custom-context"
								value={customContext}
								onChange={(e) => setCustomContext(e.target.value)}
								placeholder="Contexte additionnel (optionnel)..."
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
			{state.error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 shrink-0">
					<AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-medium text-sm text-red-900">Erreur</p>
						<p className="text-sm text-red-700 mt-0.5">{state.error}</p>
					</div>
				</div>
			)}

			{/* GENERATED MESSAGE — takes all remaining space */}
			<Card className="flex-1 flex flex-col min-h-0 border border-gray-200 shadow-sm">
				<CardHeader className="border-b border-gray-100 pb-3 shrink-0">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
								<CheckCircle2 className="h-4 w-4 text-green-600" />
							</div>
							<div>
								<CardTitle className="text-base font-semibold text-gray-900">
									Message généré
								</CardTitle>
								<CardDescription className="text-xs text-gray-500">
									{isLoading ? "Chargement..." : state.body ? "Modifiez et envoyez" : "En attente de génération"}
								</CardDescription>
							</div>
						</div>
						{state.body && !isLoading && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => copyToClipboard(editedSubject ? `${editedSubject}\n\n${editedBody}` : editedBody)}
								className="text-gray-600"
							>
								<Copy className="mr-1.5 h-3.5 w-3.5" />
								Copier
							</Button>
						)}
					</div>
				</CardHeader>

				<CardContent className="flex-1 flex flex-col min-h-0 pt-4">
					{isLoading ? (
						<div className="flex-1 flex items-center justify-center text-center p-8">
							<div className="space-y-3">
								<Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
								<p className="text-gray-500 text-sm">Chargement...</p>
							</div>
						</div>
					) : !state.body ? (
						<div className="flex-1 flex items-center justify-center text-center p-8">
							<div className="space-y-3">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
									<Wand2 className="h-8 w-8 text-gray-400" />
								</div>
								<p className="text-gray-500 text-sm">
									Configurez les paramètres et cliquez sur &quot;Générer&quot;
								</p>
							</div>
						</div>
					) : (
						<>
							{editedSubject && (
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
									className="flex-1 min-h-0 resize-none text-sm leading-relaxed"
								/>
							</div>

							<div className="pt-3 border-t border-gray-100 mt-3 flex items-center gap-2 shrink-0">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleGenerate}
									disabled={isPending}
									className="flex items-center gap-2"
								>
									<Wand2 className="h-4 w-4" />
									Régénérer
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => copyToClipboard(editedSubject ? `${editedSubject}\n\n${editedBody}` : editedBody)}
									className="flex items-center gap-2"
								>
									<Copy className="h-4 w-4" />
									Copier
								</Button>

								{hasUnsavedChanges && messageId ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleUpdateMessage}
										className="flex items-center gap-2 text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
									>
										<Save className="h-4 w-4" />
										Mettre à jour
									</Button>
								) : (
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!isSaved}
										className={`flex items-center gap-2 ${isSaved ? "text-green-600 border-green-200 bg-green-50" : ""}`}
									>
										<CheckCircle2 className="h-4 w-4" />
										{isSaved ? "Sauvegardé" : "Non sauvegardé"}
									</Button>
								)}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
