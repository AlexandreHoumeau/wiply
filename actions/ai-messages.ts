"use server";

import {
	evaluateMessageQuality,
	extractMessageParts,
} from "@/lib/email_generator/message-quality";
import {
	buildStructuredEmailBody,
	parseStructuredEmailDraft,
} from "@/lib/email_generator/structured-message";
import { MessageSchema } from "@/lib/email_generator/utils";
import { createClient } from "@/lib/supabase/server";
import { checkAiEnabled } from "@/lib/billing/checkLimit";
import { ContactVia } from "@/lib/validators/oppotunities";
import { Mistral } from "@mistralai/mistralai";
import { revalidatePath } from "next/cache";

export type AIMessageRow = {
	id: string;
	opportunity_id: string;
	agency_id: string | null;
	opportunity_status: string | null;
	channel: ContactVia;
	tone: string;
	length: string;
	custom_context: string | null;
	subject: string | null;
	body: string;
	created_at: string;
	updated_at: string;
};

export type SaveAIMessageInput = {
	opportunityId: string;
	agencyId?: string;
	opportunityStatus?: string;
	channel: ContactVia;
	tone: string;
	length: string;
	customContext?: string;
	subject?: string;
	body: string;
};

function normalizeAgencyContext(value: string | null | undefined): string | null {
	if (!value) return null;

	const trimmed = value.replace(/\s+/g, " ").trim();
	if (!trimmed) return null;

	return trimmed;
}

function normalizeKeyPoints(value: string | null | undefined): string[] {
	if (!value) return [];

	return value
		.split(/\r?\n/)
		.map((line) => line.replace(/^[-*•]\s*/, "").trim())
		.filter(Boolean)
		.slice(0, 3);
}

function extractDescriptionAnchors(description: string | null | undefined): string[] {
	if (!description) return [];

	return description
		.split(/\n+/)
		.flatMap((line) => line.split(/[.;!?]\s+/))
		.map((chunk) => chunk.replace(/\s+/g, " ").trim())
		.filter((chunk) => chunk.length >= 18)
		.slice(0, 4);
}

function getMessageGenerationModel(): string {
	return process.env.MISTRAL_MESSAGE_MODEL || "mistral-small-latest";
}

function getFallbackMessageGenerationModel(primaryModel: string): string | null {
	const fallbackModel = process.env.MISTRAL_MESSAGE_FALLBACK_MODEL?.trim();
	if (!fallbackModel || fallbackModel === primaryModel) return null;
	return fallbackModel;
}

function isMistralCapacityError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;

	const statusCode = "statusCode" in error ? error.statusCode : undefined;
	const body = "body" in error ? String(error.body ?? "") : "";
	const message = "message" in error ? String(error.message ?? "") : "";

	return (
		statusCode === 429 &&
		(
			body.includes("service_tier_capacity_exceeded") ||
			body.includes("capacity exceeded") ||
			message.includes("service_tier_capacity_exceeded") ||
			message.includes("capacity exceeded")
		)
	);
}

function getUserFacingGenerationError(error: unknown): string {
	if (isMistralCapacityError(error)) {
		return "Le service IA est temporairement saturé. Réessayez dans quelques instants.";
	}

	if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 429) {
		return "La limite de requêtes IA a été atteinte momentanément. Réessayez dans quelques instants.";
	}

	return "Échec de la génération.";
}

async function wait(ms: number) {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStructuredEmailPrompt(params: {
	agencyName: string | null;
	companyName: string;
	channelGuidelines: string;
	tone: string;
	length: string;
	companySector: string | null;
	companyWebsite: string | null;
	agencyContext: string | null;
	agencyKeyPoints: string[];
	descriptionAnchors: string[];
	statusContext: string;
	opportunityDescription: string | null;
	recentNotes: string[];
	customContext: string;
}) {
	return [
		`Canal : ${params.channelGuidelines}`,
		`Ton : ${params.tone === "formal" ? "tres formel et professionnel" : params.tone === "friendly" ? "chaleureux et aimable" : "decontracte et authentique"}`,
		`Longueur : ${params.length === "short" ? "tres concis" : "moyen mais toujours compact"}`,
		"",
		"TU NE REDIGES PAS L'EMAIL FINAL.",
		"Tu dois retourner UNIQUEMENT 6 champs de travail, un par ligne, dans ce format exact :",
		"subject: ...",
		"intro: ...",
		"observation: ...",
		"improvements: ...",
		"outcome: ...",
		"cta: ...",
		"",
		"REGLES DE SORTIE :",
		"- pas de markdown",
		"- pas de texte avant ou apres ces 6 champs",
		"- pour improvements, mets 2 a 4 points separes par |",
		"- subject = un objet d'email court et concret (3 a 7 mots idealement), suffisamment accrocheur sans etre putassier",
		"- subject doit donner envie d'ouvrir en s'appuyant sur un angle reel : clarte, offre, conversion, prise de contact, parcours, credibilite",
		"- evite les objets generiques ou plats comme Bonjour, Site web pour..., Prise de contact, Suite a..., Relance",
		"- intro = 1 phrase maximum sur l'agence, en mentionnant explicitement le nom de l'agence",
		"- observation = 1 phrase maximum, obligatoirement ancree dans la description si elle contient des points concrets",
		"- outcome = 1 phrase maximum",
		"- cta = 1 phrase maximum, douce et sans pression",
		"- evite les CTA commerciaux trop codes comme Si le sujet vous interesse..., 10 minutes par telephone, ou Quand seriez-vous disponible cette semaine ?",
		"- prefere un CTA simple et naturel, par exemple proposer d'envoyer 2 ou 3 pistes concretes ou demander si cela vaut la peine d'en discuter",
		"- n'invente aucun avis, resultat, fonctionnalite ou besoin non prouve",
		"",
		"CONTEXTE :",
		params.agencyName ? `- Nom de l'agence : ${params.agencyName}` : "",
		`- Entreprise : ${params.companyName}`,
		`- Secteur : ${params.companySector || "non specifie"}`,
		params.companyWebsite ? `- Site web du prospect : ${params.companyWebsite}` : "",
		params.agencyContext ? `- Positionnement agence : ${params.agencyContext}` : "",
		params.agencyKeyPoints.length > 0 ? `- Arguments agence disponibles (au plus 1 a reutiliser) : ${params.agencyKeyPoints.join(" | ")}` : "",
		params.descriptionAnchors.length > 0
			? `- Points concrets extraits de la description : ${params.descriptionAnchors.join(" | ")}`
			: "- Aucun point concret extrait de la description",
		`- Situation actuelle : ${params.statusContext}`,
		params.opportunityDescription ? `- Description complete : ${params.opportunityDescription}` : "",
		params.recentNotes.length > 0 ? `- Notes recentes : ${params.recentNotes.join(" | ")}` : "",
		params.customContext ? `- Contexte additionnel : ${params.customContext}` : "",
	].filter(Boolean).join("\n");
}


export async function saveAIGeneratedMessage(input: SaveAIMessageInput) {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("ai_generated_messages")
			.insert({
				opportunity_id: input.opportunityId,
				agency_id: input.agencyId ?? null,
				opportunity_status: input.opportunityStatus ?? null,
				channel: input.channel,
				tone: input.tone,
				length: input.length,
				custom_context: input.customContext || null,
				subject: input.subject || null,
				body: input.body,
			})
			.select()
			.single();

		if (error) {
			console.error("Error saving AI message:", error);
			return { success: false, error: error.message };
		}

		revalidatePath(`/opportunities/${input.opportunityId}`);
		return { success: true, data };
	} catch (error) {
		console.error("Error saving AI message:", error);
		return { success: false, error: "Une erreur est survenue" };
	}
}

export async function getAIGeneratedMessages(opportunityId: string) {
	const supabase = await createClient();
	try {
		const { data, error } = await supabase
			.from("ai_generated_messages")
			.select("*")
			.eq("opportunity_id", opportunityId)
			.order("created_at", { ascending: false });

		if (error) return { success: false, error: error.message, data: [] as AIMessageRow[] };
		return { success: true, data: (data || []) as AIMessageRow[] };
	} catch {
		return { success: false, error: "Une erreur est survenue", data: [] as AIMessageRow[] };
	}
}

export async function updateAIGeneratedMessage(
	messageId: string,
	updates: { subject?: string; body?: string }
) {
	const supabase = await createClient();
	try {
		const { data, error } = await supabase
			.from("ai_generated_messages")
			.update({ ...updates, updated_at: new Date().toISOString() })
			.eq("id", messageId)
			.select()
			.single();

		if (error) return { success: false, error: error.message };
		return { success: true, data };
	} catch {
		return { success: false, error: "Une erreur est survenue" };
	}
}

// --- GENERATION ENGINE ---

export async function generateOpportunityMessage(
	_prevState: unknown,
	formData: FormData,
	agencyId?: string
): Promise<{ subject: string | null; body: string; error?: string; id: string | null }> {
	try {
		if (agencyId) {
			const aiCheck = await checkAiEnabled(agencyId);
			if (!aiCheck.allowed) {
				return { subject: null, body: "", error: aiCheck.reason!, id: null };
			}
		}

		const apiKey = process.env.MISTRAL_API_KEY;
		if (!apiKey) return { subject: null, body: "", error: "Clé API Mistral manquante", id: null };
		const generationModel = getMessageGenerationModel();

		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();

		// 1. RÉCUPÉRATION DES RÉGLAGES IA DE L'AGENCE
		let aiConfig = null;
		if (agencyId) {
			const { data } = await supabase
				.from("agency_ai_configs")
				.select("*")
				.eq("agency_id", agencyId)
				.single();
			aiConfig = data;
		}

		// 2. PARSING DES DONNÉES DU FORMULAIRE
		const rawOpportunity = formData.get("opportunity") as string;
		const customContext = formData.get("customContext") as string;
		const rawChannel = formData.get("channel") as string;
		const shouldPersist = formData.get("persist") === "true";

		const parsedTone = formData.get("tone") || aiConfig?.tone || "friendly";
		const normalizedTone =
			parsedTone === "professional" ? "formal" : parsedTone;

		const { opportunity, tone, length, channel } = MessageSchema.parse({
			opportunity: JSON.parse(rawOpportunity),
			tone: normalizedTone,
			length: formData.get("length"),
			channel: rawChannel,
			customContext,
		});

		// 3. RÉCUPÉRATION DU LIEN DE TRACKING ACTIF + SITE WEB AGENCE
		let trackingLinkUrl: string | null = null;
		let agencyWebsite: string | null = null;
		let agencyName: string | null = null;

		const [trackingResult, agencyResult, recentNotesResult] = await Promise.all([
			supabase
				.from("tracking_links")
				.select("short_code")
				.eq("opportunity_id", opportunity.id)
				.eq("is_active", true)
				.order("created_at", { ascending: false })
				.limit(1),
			agencyId
				? supabase.from("agencies").select("website, name").eq("id", agencyId).single()
				: Promise.resolve({ data: null }),
			supabase
				.from("opportunity_events")
				.select("metadata, created_at")
				.eq("opportunity_id", opportunity.id)
				.eq("event_type", "note_added")
				.order("created_at", { ascending: false })
				.limit(3),
		]);

		const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
		if (trackingResult.data && trackingResult.data.length > 0 && appUrl) {
			trackingLinkUrl = `${appUrl}/t/${trackingResult.data[0].short_code}`;
		}
		agencyWebsite = agencyResult.data?.website || null;
		agencyName = agencyResult.data?.name || null;

		const isLost = opportunity.status === "lost";
		const companyName = opportunity.company?.name?.trim() || "cette entreprise";
		const companySector = opportunity.company?.business_sector?.trim() || null;
		const companyWebsite = opportunity.company?.website;
		const agencyContext = normalizeAgencyContext(aiConfig?.ai_context);
		const agencyKeyPoints = normalizeKeyPoints(aiConfig?.key_points);
		const descriptionAnchors = extractDescriptionAnchors(opportunity.description);
		const recentNotes = (recentNotesResult.data ?? [])
			.map((note) => (note.metadata as { text?: string } | null)?.text?.trim())
			.filter((note): note is string => Boolean(note));

		// Contextes métiers
		const statusContext = {
			"inbound": "prospect entrant — il a pris contact en premier, répondre à son initiative",
			"to_do": "première approche — aucun contact précédent",
			"first_contact": "suivi après un premier échange",
			"second_contact": "deuxième relance, toujours sans réponse concrète",
			"proposal_sent": "relance après envoi d'une proposition commerciale",
			"negotiation": "en cours de négociation des termes",
			"won": "client gagné — message de bienvenue ou de lancement",
			"lost": "prospect perdu — l'opportunité est clôturée",
		}[opportunity.status as string] || "contact professionnel";

		const channelGuidelines = {
			email: "email de prospection professionnel avec objet, 2 courts paragraphes maximum, direct, sobre et naturel",
			instagram: "DM Instagram : très court, direct, ton humain (3-5 lignes max)",
			linkedin: "InMail LinkedIn : professionnel mais accessible (5-7 lignes max)",
			phone: "script d'appel synthétique : introduction → accroche → CTA (format points)",
			IRL: "guide de conversation pour une rencontre physique (points clés à aborder)",
		}[channel] || "message professionnel";

		// 4. CONSTRUCTION DU PROMPT — FORMAT SYSTEM / USER
		const systemMessage = [
			agencyContext
				? `IDENTITE AGENCE : ${agencyContext}`
				: "Tu es un expert en prospection commerciale B2B. Tu rediges des messages concis, credibles, personnalises et orientes vers une reponse.",
			"",
			"TES ARGUMENTS DIFFERENCIANTS :",
			agencyKeyPoints.length > 0
				? agencyKeyPoints.map((point) => `- ${point}`).join("\n")
				: "- Expertise metier\n- Reactivite\n- Approche personnalisee",
			agencyWebsite ? `\nSite web de l'agence : ${agencyWebsite}` : "",
			aiConfig?.custom_instructions ? `\nINSTRUCTIONS SPECIFIQUES :\n${aiConfig.custom_instructions}` : "",
			"",
			"RÈGLES ABSOLUES :",
			"- Ne jamais inventer de faits non fournis dans le contexte",
			"- Répondre UNIQUEMENT avec le message final — aucun commentaire ni explication avant ou après",
			"- Ecrire en francais naturel, simple et credible",
			"- Toujours inclure un CTA (Call-To-Action) clair et engageant",
			"- Commencer par une accroche specifique, jamais par une formule vide du type « J'espere que vous allez bien »",
			"- Personnaliser l'accroche en fonction de l'entreprise, de son secteur ou du contexte fourni",
			"- Eviter le jargon marketing, les superlatifs vagues et les compliments artificiels",
			"- Interdire les formulations publicitaires ou decoratives comme « a tout pour plaire », « visuels percutants », « au coeur du projet »",
			"- Ne jamais inventer d'avis clients, de resultats, de cas similaires ou de fonctionnalites specifiques non confirmees",
			"- Utiliser l'identite agence comme contexte, pas comme paragraphe de branding. Garder au maximum un seul angle differentiant vraiment utile",
			"- Rester concret : une idee centrale, une preuve ou angle utile, puis un CTA",
			"- Si un lien est fourni, l'integrer naturellement sans mentionner qu'il s'agit d'un lien de tracking",
		].filter(Boolean).join("\n");

		const userMessage = channel === "email"
			? buildStructuredEmailPrompt({
				agencyName,
				companyName,
				channelGuidelines,
				tone,
				length,
				companySector,
				companyWebsite: companyWebsite ?? null,
				agencyContext,
				agencyKeyPoints,
				descriptionAnchors,
				statusContext,
				opportunityDescription: opportunity.description,
				recentNotes,
				customContext,
			})
			: [
				`Canal : ${channelGuidelines}`,
				`Ton : ${tone === "formal" ? "très formel et professionnel" : tone === "friendly" ? "chaleureux et aimable" : "décontracté et authentique"}`,
				`Longueur : ${length === "short" ? "très concis — 2 à 3 phrases maximum" : "développé et argumenté — 3 à 5 phrases"}`,
				"",
				"DESTINATAIRE :",
				`- Entreprise : ${companyName}`,
				`- Secteur : ${companySector || "non specifie"}`,
				companyWebsite ? `- Site web du prospect : ${companyWebsite}` : "",
				agencyContext ? `- Positionnement agence a garder en toile de fond : ${agencyContext}` : "",
				agencyKeyPoints.length > 0 ? `- Arguments agence disponibles (en choisir au plus 1 si utile) : ${agencyKeyPoints.join(" | ")}` : "",
				descriptionAnchors.length > 0
					? `- Points concrets extraits de la description (tu dois t'appuyer dessus pour l'observation centrale) : ${descriptionAnchors.join(" | ")}`
					: "- Aucun point concret extrait de la description : eviter toute analyse trop precise et rester sobre",
				`- Situation actuelle : ${statusContext}`,
				isLost ? "- IMPORTANT : ce prospect a refuse ou l'opportunite est perdue. Le message doit etre soit une cloture elegante, soit une tentative de reconnexion subtile et non insistante. Ne pas faire de proposition commerciale directe." : "",
				"",
				opportunity.description ? `DESCRIPTION DE L'OPPORTUNITE :\n${opportunity.description}` : "",
				recentNotes.length > 0 ? `\nNOTES RECENTES A PRENDRE EN COMPTE :\n${recentNotes.map((note) => `- ${note}`).join("\n")}` : "",
				customContext ? `\nCONTEXTE ADDITIONNEL :\n${customContext}` : "",
				"\nRedige le message maintenant.",
			].filter(Boolean).join("\n");

		const mistral = new Mistral({ apiKey });
		const fallbackGenerationModel = getFallbackMessageGenerationModel(generationModel);
		const generateText = async (messages: { role: "system" | "user"; content: string }[]) => {
			const modelsToTry = [generationModel, fallbackGenerationModel].filter(
				(model): model is string => Boolean(model)
			);
			let lastError: unknown = null;

			for (const model of modelsToTry) {
				for (let attempt = 0; attempt < 2; attempt += 1) {
					try {
						const response = await mistral.chat.complete({
							model,
							messages,
							temperature: 0.55,
						});

						const content = response.choices?.[0]?.message?.content;
						if (Array.isArray(content)) {
							return content.map((chunk) => ("text" in chunk ? chunk.text : "")).join("");
						}

						return content || "";
					} catch (error) {
						lastError = error;

						if (isMistralCapacityError(error) && attempt === 0) {
							await wait(700);
							continue;
						}

						if (isMistralCapacityError(error)) {
							break;
						}

						throw error;
					}
				}
			}

			throw lastError ?? new Error("Message generation failed");
		};

		let messageText = await generateText([
			{ role: "system", content: systemMessage },
			{ role: "user", content: userMessage },
		]);

		let subject: string | null;
		let body: string;
		if (channel === "email") {
			const structuredDraft = parseStructuredEmailDraft(messageText, companyName, agencyName);
			subject = structuredDraft.subject;
			body = buildStructuredEmailBody(structuredDraft, trackingLinkUrl);
		} else {
			const extracted = extractMessageParts({
				rawText: messageText,
				channel,
				status: opportunity.status,
				companyName,
			});
			subject = extracted.subject;
			body = extracted.body;
		}

		const qualityIssues = evaluateMessageQuality({
			channel,
			subject,
			body,
			companyName,
			companyWebsite,
			trackingLinkUrl,
		});

		if (qualityIssues.length > 0) {
			messageText = await generateText([
				{ role: "system", content: systemMessage },
				{
					role: "user",
					content: [
						userMessage,
						"",
						"Le premier brouillon est insuffisant. Corrige-le selon ces points :",
						...qualityIssues.map((issue) => `- ${issue}`),
						"",
						"Brouillon a corriger :",
						messageText,
						"",
						"Style cible : un vrai email de prospection bref, humain, direct, sans effets de style publicitaires.",
						"Si un detail n'est pas prouve par le contexte, supprime-le au lieu de l'inventer.",
						"Ne propose pas de fonctionnalites specifiques sauf si elles sont explicitement justifiees par le contexte.",
						"",
						"Retourne uniquement la version finale corrigee.",
					].join("\n"),
				},
			]);

			if (channel === "email") {
				const repairedDraft = parseStructuredEmailDraft(messageText, companyName, agencyName);
				subject = repairedDraft.subject;
				body = buildStructuredEmailBody(repairedDraft, trackingLinkUrl);
			} else {
				const repaired = extractMessageParts({
					rawText: messageText,
					channel,
					status: opportunity.status,
					companyName,
				});
				subject = repaired.subject;
				body = repaired.body;
			}
		}

		let savedMessage: { id: string } | null = null;

		if (shouldPersist) {
			const { data } = await supabase
				.from("ai_generated_messages")
				.insert({
					opportunity_id: opportunity.id,
					agency_id: agencyId,
					opportunity_status: opportunity.status,
					channel,
					tone,
					length,
					custom_context: customContext || null,
					subject,
					body,
				})
				.select()
				.single();

			savedMessage = data;
		}

		// Log timeline event (fire-and-forget)
		if (savedMessage && user) {
			supabase.from("opportunity_events").insert({
				opportunity_id: opportunity.id,
				user_id: user.id,
				event_type: "ai_message_generated",
				metadata: { channel, tone, has_tracking_link: !!trackingLinkUrl },
			}).then(() => {});
		}

		return { subject, body, id: savedMessage?.id || null };

	} catch (error) {
		console.error("Erreur génération message:", error);
		return { subject: null, body: "", error: getUserFacingGenerationError(error), id: null };
	}
}

export async function deleteGeneratedMessage(messageId: string) {
	const supabase = await createClient();
	const { error } = await supabase.from("ai_generated_messages").delete().eq("id", messageId);
	if (error) throw error;
}
