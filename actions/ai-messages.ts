"use server";

import { MessageSchema } from "@/lib/email_generator/utils";
import { createClient } from "@/lib/supabase/server";
import { checkAiEnabled } from "@/lib/billing/checkLimit";
import { Mistral } from '@mistralai/mistralai';
import { revalidatePath } from "next/cache";

export type SaveAIMessageInput = {
	opportunityId: string;
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

		if (error) return { success: false, error: error.message, data: [] };
		return { success: true, data: data || [] };
	} catch {
		return { success: false, error: "Une erreur est survenue", data: [] };
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
	prevState: any,
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

		// Contextes métiers
		const statusContext = {
			"to_do": "première approche — aucun contact précédent",
			"first_contact": "suivi après un premier échange",
			"second_contact": "deuxième relance, toujours sans réponse concrète",
			"proposal_sent": "relance après envoi d'une proposition commerciale",
			"negotiation": "en cours de négociation des termes",
			"won": "client gagné — message de bienvenue ou de lancement",
			"lost": "prospect perdu — clôture professionnelle ou tentative de reconquête",
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
				: "Tu es un expert en prospection commerciale. Tu rédiges des messages efficaces, personnalisés et orientés résultats.",
			"",
			"TES ARGUMENTS DIFFÉRENCIANTS :",
			aiConfig?.key_points || "- Expertise métier\n- Réactivité\n- Approche personnalisée",
			agencyWebsite ? `\nSite web de l'agence : ${agencyWebsite}` : "",
			aiConfig?.custom_instructions ? `\nINSTRUCTIONS SPÉCIFIQUES :\n${aiConfig.custom_instructions}` : "",
			"",
			"RÈGLES ABSOLUES :",
			"- Ne jamais inventer de faits non fournis dans le contexte",
			"- Répondre UNIQUEMENT avec le message final — aucun commentaire ni explication avant ou après",
			"- Toujours inclure un CTA (Call-To-Action) clair et engageant",
			"- Personnaliser l'accroche en fonction de l'entreprise et de son secteur",
		].filter(Boolean).join("\n");

		const companyWebsite = opportunity.company?.website;

		const userMessage = [
			`Canal : ${channelGuidelines}`,
			`Ton : ${tone === "formal" ? "très formel et professionnel" : tone === "friendly" ? "chaleureux et aimable" : "décontracté et authentique"}`,
			`Longueur : ${length === "short" ? "très concis — 2 à 3 phrases maximum" : "développé et argumenté — 3 à 5 phrases"}`,
			"",
			"DESTINATAIRE :",
			`- Entreprise : ${opportunity.company.name}`,
			`- Secteur : ${opportunity.company?.business_sector || "non spécifié"}`,
			companyWebsite ? `- Site web du prospect : ${companyWebsite}` : "",
			`- Situation actuelle : ${statusContext}`,
			"",
			opportunity.description ? `DESCRIPTION DE L'OPPORTUNITÉ :\n${opportunity.description}` : "",
			customContext ? `\nCONTEXTE ADDITIONNEL :\n${customContext}` : "",
			trackingLinkUrl
				? `\nLIEN DE SUIVI À INCLURE OBLIGATOIREMENT :\n${trackingLinkUrl}\n(Intègre ce lien de façon naturelle — présente-le comme un accès à une démo, un portfolio, une étude de cas ou toute ressource pertinente selon le contexte.)`
				: "",
			channel === "email"
				? "\nFORMAT EMAIL : La première ligne doit être uniquement l'objet (ex: \"Objet : ...\"), suivi d'une ligne vide, puis le corps du message."
				: "",
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
			temperature: 0.65,
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
			}).then(() => {});
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