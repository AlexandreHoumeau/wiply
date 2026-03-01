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

		// Contextes métiers
		const statusContext = {
			"to_do": "premier contact, introduction",
			"first_contact": "suivi après premier échange",
			"proposal_sent": "relance suite à proposition envoyée",
			"negotiation": "négociation des termes",
			"won": "bienvenue et kickoff",
			"lost": "clôture professionnelle",
		}[opportunity.status as string] || "contact professionnel";

		const channelGuidelines = {
			email: "Email professionnel avec objet et corps structuré",
			instagram: "DM Instagram, très court et direct",
			linkedin: "Message LinkedIn (InMail), pro mais pas rigide",
			phone: "Script d'appel synthétique",
			IRL: "Guide de conversation pour rencontre physique",
		}[channel] || "Message professionnel";

		// 3. CONSTRUCTION DU PROMPT DYNAMIQUE
		const prompt = `
            <s>[INST]
            IDENTITÉ DE L'EXPÉDITEUR (TON AGENCE) :
            ${aiConfig?.ai_context ? aiConfig.ai_context : "Tu es un agent commercial professionnel."}
            
            TES POINTS FORTS & ARGUMENTS DE VENTE :
            ${aiConfig?.key_points ? aiConfig.key_points : "- Expertise métier et réactivité."}

            CONTEXTE DU PROSPECT :
            - Entreprise : ${opportunity.company.name}
            - Phase actuelle : ${statusContext}
            - Secteur : ${opportunity.company.business_sector || "non spécifié"}
            - Description de l'opportunité : ${opportunity.description || "Pas de description"}
            ${customContext ? `- Note additionnelle : ${customContext}` : ""}

            CONSIGNES DE RÉDACTION :
            - Canal : ${channelGuidelines}
            - Ton : ${tone === "formal" ? "très formel" : tone === "friendly" ? "chaleureux/amical" : "décontracté"}
            - Longueur : ${length === "short" ? "très concis (2-3 phrases)" : "détaillé et argumenté"}
            ${aiConfig?.custom_instructions ? `- INSTRUCTIONS SPÉCIFIQUES À RESPECTER : ${aiConfig.custom_instructions}` : ""}

            RÈGLES D'OR :
            1. Ne JAMAIS inventer de faits non mentionnés.
            2. Personnalise l'accroche par rapport à l'entreprise.
            3. Inclus un Call-To-Action (CTA) clair.
            4. Ne donne QUE le message final, sans aucun commentaire avant ou après.
            ${channel === "email" ? "5. La première ligne DOIT être le SUJET de l'email." : ""}

            Rédige le message maintenant.
            [/INST]</s>`;

		// 4. APPEL MISTRAL AI
		const mistral = new Mistral({ apiKey });
		const response = await mistral.chat.complete({
			model: "mistral-small-latest",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
		});

		let messageText = "";
		const content = response.choices?.[0]?.message?.content;
		if (Array.isArray(content)) {
			messageText = content.map(c => ("text" in c ? c.text : "")).join("");
		} else {
			messageText = content || "";
		}

		// 5. EXTRACTION SUJET / CORPS
		let subject: string | null = null;
		let body = messageText;

		if (channel === "email") {
			const parts = messageText.split("\n").filter(p => p.trim() !== "");
			if (parts.length > 1) {
				subject = parts[0].replace(/^(Sujet|Subject|Objet)\s*:\s*/i, "").trim();
				body = parts.slice(1).join("\n").trim();
			}
		}

		// 6. SAUVEGARDE EN BASE
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
				metadata: { channel, tone },
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