"use server";

import { MessageSchema } from "@/lib/email_generator/utils";
import { createClient } from "@/lib/supabase/server";
import { checkAiEnabled } from "@/lib/billing/checkLimit";
import { Mistral } from '@mistralai/mistralai';
import { revalidatePath } from "next/cache";

export type AIMessageRow = {
	id: string;
	opportunity_id: string;
	agency_id: string | null;
	opportunity_status: string | null;
	channel: string;
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
	opportunityStatus?: string;
	channel: string;
	tone: string;
	length: string;
	customContext?: string;
	subject?: string;
	body: string;
};


export async function saveAIGeneratedMessage(input: SaveAIMessageInput) {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("ai_generated_messages")
			.insert({
				opportunity_id: input.opportunityId,
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
	_prevState: any,
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

		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();

		// 1. RÉCUPÉRATION DES RÉGLAGES IA DE L'AGENCE
		let aiConfig = null;
		if (agencyId) {
			const { data } = await supabase
				.from('agency_ai_configs')
				.select('*')
				.eq('agency_id', agencyId)
				.single();
			aiConfig = data;
		}

		// 2. PARSING DES DONNÉES DU FORMULAIRE
		const rawOpportunity = formData.get("opportunity") as string;
		const customContext = formData.get("customContext") as string;
		const channel = formData.get("channel") as string;

		const { opportunity, tone, length } = MessageSchema.parse({
			opportunity: JSON.parse(rawOpportunity),
			tone: formData.get("tone") || aiConfig?.tone || "professional",
			length: formData.get("length"),
			channel,
			customContext,
		});

		// 3. RÉCUPÉRATION DU LIEN DE TRACKING ACTIF + SITE WEB AGENCE
		let trackingLinkUrl: string | null = null;
		let agencyWebsite: string | null = null;

		const [trackingResult, agencyResult] = await Promise.all([
			supabase
				.from("tracking_links")
				.select("short_code")
				.eq("opportunity_id", opportunity.id)
				.eq("is_active", true)
				.order("created_at", { ascending: false })
				.limit(1),
			agencyId
				? supabase.from("agencies").select("website").eq("id", agencyId).single()
				: Promise.resolve({ data: null }),
		]);

		const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
		if (trackingResult.data && trackingResult.data.length > 0 && appUrl) {
			trackingLinkUrl = `${appUrl}/t/${trackingResult.data[0].short_code}`;
		}
		agencyWebsite = (agencyResult as any).data?.website || null;

		const isLost = opportunity.status === "lost";

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
			email: "email professionnel avec sujet et corps structuré (2-4 paragraphes max)",
			instagram: "DM Instagram : très court, direct, ton humain (3-5 lignes max)",
			linkedin: "InMail LinkedIn : professionnel mais accessible (5-7 lignes max)",
			phone: "script d'appel synthétique : introduction → accroche → CTA (format points)",
			IRL: "guide de conversation pour une rencontre physique (points clés à aborder)",
		}[channel] || "message professionnel";

		// 4. CONSTRUCTION DU PROMPT — FORMAT SYSTEM / USER
		const systemMessage = [
			aiConfig?.ai_context
				? aiConfig.ai_context
				: "Tu écris des messages de prospection au nom de l'agence. Tu es une vraie personne qui s'adresse directement à un prospect — pas un outil marketing.",
			"",
			"CE QUE PROPOSE L'AGENCE :",
			aiConfig?.key_points || "- Accompagnement personnalisé\n- Réactivité\n- Résultats concrets",
			agencyWebsite ? `\nSite web de l'agence : ${agencyWebsite}` : "",
			aiConfig?.custom_instructions ? `\nINSTRUCTIONS SPÉCIFIQUES :\n${aiConfig.custom_instructions}` : "",
			"",
			"CE QUI EST INTERDIT :",
			`Phrases d'accroche génériques : "je me permets de vous contacter", "suite à mes recherches sur votre entreprise", "dans le cadre de notre développement commercial", "permettez-moi de me présenter"`,
			`Formules de fin : "n'hésitez pas à me contacter", "je reste à votre disposition", "je serais ravi d'échanger avec vous", "serait-il possible d'organiser un échange ?", "cordialement"`,
			`Jargon commercial : "valeur ajoutée", "synergie", "expertise reconnue", "solutions innovantes", "accompagnement sur mesure", "notre savoir-faire", "nous serions honorés"`,
			"Phrases à rallonge avec plusieurs virgules.",
			"",
			"COMMENT ÉCRIRE :",
			"- Phrases courtes et directes. Pas plus d'une virgule par phrase.",
			"- Accroche spécifique à cette entreprise ou ce secteur. Pas de formule générique.",
			"- Un seul angle, une seule idée forte. Ne pas empiler plusieurs arguments.",
			"- Terminer par une question simple et naturelle — pas un appel à l'action formel.",
			"- Si le contexte disponible est minimal, écrire un message court et curieux plutôt que de rembourrer avec des généralités sur l'agence.",
			"",
			"RÈGLE ABSOLUE : Répondre UNIQUEMENT avec le message final — aucun commentaire ni explication avant ou après.",
		].filter(Boolean).join("\n");

		const companyWebsite = opportunity.company?.website;

		const channelExample: Record<string, string> = {
			email: `EXEMPLE DE STYLE (ton et structure uniquement — ne pas copier le contenu) :
---
Objet : Une question sur [Nom Entreprise]

Bonjour,

Vous travaillez beaucoup sur des projets dans le secteur hôtelier — c'est exactement là où on intervient le plus souvent.

La question que nos clients soulèvent souvent : comment rester visibles auprès des décideurs sans y passer des heures. On a quelques retours concrets à partager.

[lien de suivi]

Bonne journée
---`,
			linkedin: `EXEMPLE DE STYLE :
---
Bonjour,

[Nom Entreprise] apparaît souvent sur des projets dans le secteur hôtelier — ça correspond à ce qu'on voit chez nos meilleurs clients.

Je voulais vous demander : c'est un segment que vous cherchez à développer, ou plutôt ponctuel ?
---`,
			instagram: `EXEMPLE DE STYLE :
---
Bonjour, j'ai vu vos dernières réalisations dans le secteur hôtelier — vraiment le genre de projets où on peut faire des choses intéressantes ensemble. Vous êtes ouverts à échanger ?
---`,
			phone: `EXEMPLE DE STYLE :
---
Intro : "Bonjour, je vous appelle depuis [Agence]. On travaille avec des équipes dans votre secteur — j'avais une question rapide, vous avez 2 minutes ?"
Accroche : observation concrète sur leur activité ou secteur
Question ouverte : sur leur situation actuelle, pas sur votre offre
Transition : écoute puis exemple concret si intéressé
---`,
			IRL: `EXEMPLE DE STYLE :
---
Intro : "[Nom Entreprise] — je vous ai vu sur [projet/secteur], c'est exactement le type de clients avec qui on travaille."
Question d'ouverture : "Comment vous gérez actuellement [problème identifié] ?"
Suite : écouter, puis partager un exemple concret seulement si ça résonne.
---`,
		};

		const userMessage = [
			`Canal : ${channelGuidelines}`,
			`Ton : ${tone === "formal" ? "professionnel mais direct" : tone === "friendly" ? "chaleureux et naturel" : "décontracté et authentique"}`,
			`Longueur : ${length === "short" ? "très court — 2 à 3 phrases maximum, pas de padding" : "3 à 5 phrases — développé mais sans rembourrage"}`,
			"",
			"PROSPECT :",
			`- Entreprise : ${opportunity.company.name}`,
			`- Secteur : ${opportunity.company?.business_sector || "non spécifié"}`,
			companyWebsite ? `- Site web du prospect : ${companyWebsite}` : "",
			`- Situation : ${statusContext}`,
			isLost ? "- IMPORTANT : ce prospect a refusé ou l'opportunité est perdue. Écrire soit une clôture élégante (remercier, laisser la porte ouverte), soit une tentative de reconquête subtile. Ne pas faire de proposition commerciale directe." : "",
			"",
			opportunity.description ? `CONTEXTE DE L'OPPORTUNITÉ :\n${opportunity.description}` : "",
			customContext ? `\nCONTEXTE ADDITIONNEL :\n${customContext}` : "",
			trackingLinkUrl
				? `\nLIEN À INCLURE :\n${trackingLinkUrl}\n(Intègre ce lien naturellement — présente-le comme un accès à une démo, un portfolio ou une étude de cas pertinente.)`
				: "",
			channel === "email"
				? "\nFORMAT EMAIL : La première ligne doit être uniquement l'objet (ex: \"Objet : ...\"), suivi d'une ligne vide, puis le corps du message."
				: "",
			channelExample[channel] ? `\n${channelExample[channel]}` : "",
			"\nRédige le message maintenant.",
		].filter(Boolean).join("\n");

		// 5. APPEL MISTRAL AI
		const mistral = new Mistral({ apiKey });
		const response = await mistral.chat.complete({
			model: "mistral-small-latest",
			messages: [
				{ role: "system", content: systemMessage },
				{ role: "user", content: userMessage },
			],
			temperature: 0.82,
		});

		let messageText = "";
		const content = response.choices?.[0]?.message?.content;
		if (Array.isArray(content)) {
			messageText = content.map(c => ("text" in c ? c.text : "")).join("");
		} else {
			messageText = content || "";
		}

		// 6. EXTRACTION SUJET / CORPS
		let subject: string | null = null;
		let body = messageText;

		if (channel === "email") {
			const lines = messageText.split("\n");
			const subjectLineIndex = lines.findIndex(l => /^(objet|sujet|subject)\s*:/i.test(l.trim()));
			if (subjectLineIndex !== -1) {
				subject = lines[subjectLineIndex].replace(/^(objet|sujet|subject)\s*:\s*/i, "").trim();
				body = lines.slice(subjectLineIndex + 1).join("\n").trim();
			} else if (lines.length > 1) {
				subject = lines[0].trim();
				body = lines.slice(1).join("\n").trim();
			}
		}

		// 7. SAUVEGARDE EN BASE
		const { data: savedMessage } = await supabase
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

		// Log timeline event (fire-and-forget)
		if (savedMessage && user) {
			supabase.from("opportunity_events").insert({
				opportunity_id: opportunity.id,
				user_id: user.id,
				event_type: "ai_message_generated",
				metadata: { channel, tone, has_tracking_link: !!trackingLinkUrl },
			}).then(() => { });
		}

		return { subject, body, id: savedMessage?.id || null };

	} catch (error) {
		console.error("Erreur génération message:", error);
		return { subject: null, body: "", error: "Échec de la génération.", id: null };
	}
}

export async function deleteGeneratedMessage(messageId: string) {
	const supabase = await createClient();
	const { error } = await supabase.from("ai_generated_messages").delete().eq("id", messageId);
	if (error) throw error;
}

// --- CHAT ENGINE ---

export type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
	created_at: string;
};

export type ConversationRow = {
	id: string;
	opportunity_id: string;
	agency_id: string | null;
	messages: ChatMessage[];
	created_at: string;
	updated_at: string;
};

export async function getConversation(opportunityId: string): Promise<{ data: ConversationRow | null }> {
	const supabase = await createClient();
	const { data } = await supabase
		.from('ai_chat_conversations')
		.select('*')
		.eq('opportunity_id', opportunityId)
		.maybeSingle();
	return { data: data as ConversationRow | null };
}

export async function clearConversation(opportunityId: string): Promise<void> {
	const supabase = await createClient();
	await supabase
		.from('ai_chat_conversations')
		.delete()
		.eq('opportunity_id', opportunityId);
}

export async function sendChatMessage(params: {
	opportunityId: string;
	agencyId?: string;
	userMessage: string;
	opportunity: import('@/lib/validators/oppotunities').OpportunityWithCompany;
	channel: string;
	tone: string;
	length: string;
	notes?: string[];
	trackingLinkUrl?: string | null;
}): Promise<{ content: string; error?: string }> {
	const { opportunityId, agencyId, userMessage, opportunity, channel, tone, length, notes, trackingLinkUrl } = params;

	try {
		if (agencyId) {
			const aiCheck = await checkAiEnabled(agencyId);
			if (!aiCheck.allowed) {
				return { content: '', error: aiCheck.reason! };
			}
		}

		const apiKey = process.env.MISTRAL_API_KEY;
		if (!apiKey) return { content: '', error: 'Clé API Mistral manquante' };

		const supabase = await createClient();

		// Fetch agency AI config + website in parallel
		const [aiConfigData, agencyData, conversationData] = await Promise.all([
			agencyId
				? supabase.from('agency_ai_configs').select('*').eq('agency_id', agencyId).single().then(r => r.data)
				: Promise.resolve(null),
			agencyId
				? supabase.from('agencies').select('website').eq('id', agencyId).single().then(r => r.data)
				: Promise.resolve(null),
			supabase
				.from('ai_chat_conversations')
				.select('*')
				.eq('opportunity_id', opportunityId)
				.maybeSingle()
				.then(r => r.data),
		]);

		const aiConfig = aiConfigData as { ai_context?: string; key_points?: string; custom_instructions?: string; tone?: string } | null;
		const agencyWebsite: string | null = (agencyData as { website?: string } | null)?.website ?? null;
		const existingConversation = conversationData as ConversationRow | null;
		const history: ChatMessage[] = existingConversation?.messages || [];

		const statusContext = {
			"inbound": "prospect entrant — il a pris contact en premier",
			"to_do": "première approche — aucun contact précédent",
			"first_contact": "suivi après un premier échange",
			"second_contact": "deuxième relance, toujours sans réponse",
			"proposal_sent": "relance après envoi d'une proposition commerciale",
			"negotiation": "en cours de négociation des termes",
			"won": "client gagné — message de bienvenue ou de lancement",
			"lost": "prospect perdu — l'opportunité est clôturée",
		}[opportunity.status as string] || "contact professionnel";

		const channelGuidelines = {
			email: "email avec sujet en première ligne (\"Objet : ...\"), puis corps structuré",
			instagram: "DM Instagram : très court, 3-5 lignes max",
			linkedin: "InMail LinkedIn : professionnel mais accessible, 5-7 lignes max",
			phone: "script d'appel : introduction → accroche → question (format points)",
			IRL: "guide pour une rencontre physique (points clés à aborder)",
		}[channel] || "message professionnel";

		const toneLabel = tone === "formal" ? "professionnel mais direct" : tone === "friendly" ? "chaleureux et naturel" : "décontracté et authentique";
		const lengthLabel = length === "short" ? "très court — 2 à 3 phrases, pas de padding" : "3 à 5 phrases — développé mais sans rembourrage";

		const mistral = new Mistral({ apiKey });

		// Pre-step: analyze opportunity description into an actionable brief on the first message.
		// This forces the model to explicitly process the notes before generating anything.
		let situationBrief: string | null = null;
		const isFirstMessage = history.length === 0;
		if (isFirstMessage && opportunity.description?.trim()) {
			try {
				const analysisResponse = await mistral.chat.complete({
					model: "mistral-medium-latest",
					messages: [
						{
							role: "system",
							content: "Tu es un assistant commercial. Analyse les notes d'une opportunité et extrais ce qui est utile pour rédiger un message de prospection.",
						},
						{
							role: "user",
							content: `Prospect : ${opportunity.company?.name || "?"} (${opportunity.company?.business_sector || "secteur inconnu"})\nStatut : ${statusContext}\n\nNotes :\n"${opportunity.description}"\n\nEn 3 points courts, résume :\n1. La nature de la relation et la situation actuelle\n2. Ce que le prospect cherche (ou ne cherche pas encore)\n3. L'angle le plus juste pour un premier message\n\nSois factuel. Ne réponds qu'avec ces 3 points, sans introduction.`,
						},
					],
					temperature: 0.2,
				});
				const raw = analysisResponse.choices?.[0]?.message?.content;
				situationBrief = (Array.isArray(raw) ? raw.map(c => ("text" in c ? c.text : "")).join("") : raw) || null;
			} catch {
				// Fall back to raw description if analysis fails
			}
		}

		const systemPrompt = [
			// 1. Persona
			aiConfig?.ai_context
				? aiConfig.ai_context
				: "Tu rédiges des messages de prospection. Tu es une vraie personne qui s'adresse directement à un prospect — pas un copywriter, pas un outil marketing.",
			"",
			// 2. Opportunity context — anchored first
			"CONTEXTE DE CETTE OPPORTUNITÉ :",
			`- Prospect : ${opportunity.company?.name || "non spécifié"} (${opportunity.company?.business_sector || "secteur non spécifié"})`,
			opportunity.company?.website ? `- Site web du prospect : ${opportunity.company.website}` : "",
			`- Statut de la relation : ${statusContext}`,
			situationBrief
				? `\nANALYSE DE LA SITUATION (basée sur les notes) :\n${situationBrief}`
				: opportunity.description
					? `- Notes brutes : ${opportunity.description}`
					: "- Aucune note disponible",
			notes && notes.length > 0 ? `\nNOTES DE L'ÉQUIPE SUR CE PROSPECT :\n${notes.map(n => `- ${n}`).join('\n')}` : "",
			opportunity.status === "lost" ? "\nAttention : prospect perdu. Écrire une clôture élégante ou une tentative de reconquête subtile — pas de proposition directe." : "",
			"",
			// 3. Agency context
			"CE QUE PROPOSE L'AGENCE :",
			aiConfig?.key_points || "- Accompagnement personnalisé\n- Réactivité\n- Résultats concrets",
			agencyWebsite ? `Site web de l'agence : ${agencyWebsite}` : "",
			aiConfig?.custom_instructions ? `\nINSTRUCTIONS SPÉCIFIQUES :\n${aiConfig.custom_instructions}` : "",
			"",
			// 4. Format
			`FORMAT : ${channelGuidelines}`,
			`TON : ${toneLabel}`,
			`LONGUEUR : ${lengthLabel}`,
			"",
			// 5. Hard rules
			"RÈGLES ABSOLUES :",
			"- Ne jamais utiliser de placeholders comme [Prénom], [Nom], [Entreprise]. Le message doit être prêt à envoyer tel quel.",
			"- Si le prénom du destinataire est inconnu, commencer directement par \"Bonjour,\" sans prénom.",
			"- Ne pas inventer de faits absents du contexte ci-dessus.",
			"- Répondre UNIQUEMENT avec le message final — aucun commentaire, aucune explication.",
			"- Les instructions données dans la conversation ont la priorité absolue. Les suivre à la lettre.",
			trackingLinkUrl ? `- LIEN DE SUIVI À INCLURE : ${trackingLinkUrl} — intègre-le naturellement (portfolio, démo, ressource pertinente). Ne pas le mentionner comme "lien de suivi".` : "",
			`- Interdits : "je me permets", "n'hésitez pas", "je reste à votre disposition", "je serais ravi", "valeur ajoutée", "expertise reconnue", "accompagnement sur mesure".`,
			"- Phrases courtes. Un seul angle par message. Finir par une question directe — pas un CTA formel.",
		].filter(Boolean).join("\n");

		// Build message history for Mistral
		const mistralMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
			...history.map(m => ({ role: m.role, content: m.content })),
			{ role: 'user', content: userMessage },
		];

		const response = await mistral.chat.complete({
			model: "mistral-medium-latest",
			messages: [
				{ role: "system", content: systemPrompt },
				...mistralMessages,
			],
			temperature: 0.82,
		});

		let aiContent = "";
		const responseContent = response.choices?.[0]?.message?.content;
		if (Array.isArray(responseContent)) {
			aiContent = responseContent.map(c => ("text" in c ? c.text : "")).join("");
		} else {
			aiContent = responseContent || "";
		}

		if (!aiContent) return { content: '', error: 'Réponse vide du modèle.' };

		// Persist the updated conversation
		const now = new Date().toISOString();
		const newMessages: ChatMessage[] = [
			...history,
			{ role: 'user', content: userMessage, created_at: now },
			{ role: 'assistant', content: aiContent, created_at: now },
		];

		await supabase
			.from('ai_chat_conversations')
			.upsert(
				{
					opportunity_id: opportunityId,
					agency_id: agencyId || null,
					messages: newMessages,
					updated_at: now,
				},
				{ onConflict: 'opportunity_id' }
			);

		return { content: aiContent };

	} catch (error) {
		console.error('Erreur chat message:', error);
		return { content: '', error: 'Échec de la génération.' };
	}
}
