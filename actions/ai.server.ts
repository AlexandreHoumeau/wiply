"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { checkAiEnabled } from "@/lib/billing/checkLimit"
import { Mistral } from "@mistralai/mistralai"

export type AIConfigState = {
    success?: boolean
    error?: string
    message?: string
}

export async function updateAIConfigAction(_prevState: unknown, formData: FormData): Promise<AIConfigState> {
    const supabase = await createClient()

    // 1. Récupérer l'utilisateur et son agence
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non authentifié" }

    const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'agency_admin') {
        return { error: "Seuls les administrateurs peuvent modifier cette configuration." }
    }

    // 2. Extraire les données du formulaire
    const agency_id = profile.agency_id
    const ai_context = formData.get('context') as string
    const key_points = formData.get('keyPoints') as string
    const tone = formData.get('tone') as string
    const custom_instructions = formData.get('instructions') as string

    // 3. Upsert dans la base de données
    const { error } = await supabase
        .from('agency_ai_configs')
        .upsert({
            agency_id,
            ai_context,
            key_points,
            tone,
            custom_instructions,
            updated_at: new Date().toISOString()
        }, { onConflict: 'agency_id' })

    if (error) {
        console.error("Error updating AI config:", error)
        return { error: "Erreur lors de la sauvegarde en base de données." }
    }

    // 4. Revalider le cache pour mettre à jour l'UI
    revalidatePath('/app/agency/ai')

    return {
        success: true,
        message: "L'intelligence artificielle de votre agence a été mise à jour !"
    }
}

/**
 * Analyse le site web d'un prospect et génère une description des points forts/faibles
 * ainsi que des opportunités pour une agence web.
 */
export async function analyzeCompanyWebsiteAction(
    websiteUrl: string,
    agencyId: string
): Promise<{ success: true; analysis: string } | { success: false; error: string; needsUpgrade?: boolean }> {
    const aiCheck = await checkAiEnabled(agencyId)
    if (!aiCheck.allowed) return { success: false, error: aiCheck.reason!, needsUpgrade: true }

    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) return { success: false, error: "Clé API Mistral manquante" }

    let pageText: string
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(websiteUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Wiply-Bot/1.0)" },
        })
        clearTimeout(timeout)
        const html = await res.text()
        pageText = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 6000)
    } catch {
        return { success: false, error: "Impossible d'accéder au site web. Vérifiez l'URL." }
    }

    if (!pageText) return { success: false, error: "Aucun contenu lisible trouvé sur ce site." }

    const mistral = new Mistral({ apiKey })
    const response = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: [
            {
                role: "system",
                content:
                    "Tu es consultant en agence web. Analyse le contenu de ce site et génère une description concise (3 à 5 phrases) couvrant les points forts, les points faibles, et les services qu'une agence web pourrait proposer pour l'améliorer. Réponds directement en français, sans titre ni liste à puces.",
            },
            {
                role: "user",
                content: `Voici le contenu textuel du site à analyser :\n\n${pageText}`,
            },
        ],
        temperature: 0.5,
    })

    const content = response.choices?.[0]?.message?.content
    let analysis = ""
    if (Array.isArray(content)) {
        analysis = content.map((c) => ("text" in c ? c.text : "")).join("")
    } else {
        analysis = content || ""
    }

    if (!analysis) return { success: false, error: "L'analyse n'a retourné aucun résultat." }

    return { success: true, analysis }
}

export async function enrichOpportunityImportRowAction(
    payload: {
        agencyId: string
        website?: string
        email?: string
        companyName?: string
        title?: string
    }
): Promise<
    | { success: true; suggestions: { company_name?: string; name?: string; description?: string } }
    | { success: false; error: string; needsUpgrade?: boolean }
> {
    const aiCheck = await checkAiEnabled(payload.agencyId)
    if (!aiCheck.allowed) return { success: false, error: aiCheck.reason!, needsUpgrade: true }

    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) return { success: false, error: "Clé API Mistral manquante" }

    const hasWebsite = !!payload.website?.trim()
    const hasEmail = !!payload.email?.trim()
    if (!hasWebsite && !hasEmail) {
        return { success: false, error: "Un site web ou un email est nécessaire pour l'enrichissement IA." }
    }

    let pageText = ""
    if (hasWebsite) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10000)
            const res = await fetch(payload.website!, {
                signal: controller.signal,
                headers: { "User-Agent": "Mozilla/5.0 (compatible; Wiply-Bot/1.0)" },
            })
            clearTimeout(timeout)
            const html = await res.text()
            pageText = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 5000)
        } catch {
            pageText = ""
        }
    }

    const mistral = new Mistral({ apiKey })
    const response = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: [
            {
                role: "system",
                content:
                    "Tu aides une agence web à enrichir une fiche opportunité CRM. Réponds uniquement en JSON avec les clés company_name, name, description. company_name doit être court et crédible. name doit être une proposition de titre d'opportunité en français, concise, orientée prestation web. description doit être une phrase courte ou vide si tu n'es pas sûr. N'invente pas de téléphone ou d'email.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    website: payload.website || "",
                    email: payload.email || "",
                    current_company_name: payload.companyName || "",
                    current_title: payload.title || "",
                    website_text_excerpt: pageText,
                }),
            },
        ],
        temperature: 0.3,
        responseFormat: { type: "json_object" },
    })

    const content = response.choices?.[0]?.message?.content
    const raw = Array.isArray(content)
        ? content.map((c) => ("text" in c ? c.text : "")).join("")
        : content || ""

    if (!raw) return { success: false, error: "Aucune suggestion IA n'a été retournée." }

    try {
        const parsed = JSON.parse(raw) as { company_name?: string; name?: string; description?: string }
        return {
            success: true,
            suggestions: {
                company_name: parsed.company_name?.trim() || undefined,
                name: parsed.name?.trim() || undefined,
                description: parsed.description?.trim() || undefined,
            },
        }
    } catch {
        return { success: false, error: "Réponse IA invalide." }
    }
}

/**
 * Récupère la config actuelle (utilisé par le Server Component)
 */
export async function getAIConfig(agencyId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('agency_ai_configs')
        .select('*')
        .eq('agency_id', agencyId)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = Not Found, ce qui est OK au début
        console.error("Fetch error:", error)
    }
    return data
}
