"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { checkAiEnabled, checkQuoteEnabled } from "@/lib/billing/checkLimit"
import {
  CreateQuoteInput,
  UpdateQuoteInput,
  CreateQuoteItemInput,
  ALLOWED_TRANSITIONS,
  QuoteStatus,
} from "@/lib/validators/quotes"
import { nanoid } from "nanoid"

async function getAgencyId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single()

  if (!profile?.agency_id) throw new Error("Agence introuvable")
  return profile.agency_id
}

export async function getQuotes(filters?: {
  status?: string
  company_id?: string
  search?: string
}) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  let query = supabase
    .from("quotes")
    .select("*, company:companies(id, name), opportunity:opportunities(id, name)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters?.company_id) {
    query = query.eq("company_id", filters.company_id)
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getQuote(id: string) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data, error } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*), company:companies(id, name), opportunity:opportunities(id, name)")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .single()

  if (error || !data) throw new Error("Devis introuvable")
  return data
}

export async function getPublicQuote(token: string) {
  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("id, title, description, status, valid_until, currency, discount_type, discount_value, tax_rate, notes, created_at, company:companies(name), agency:agencies(name, logo_url, primary_color, secondary_color)")
    .eq("token", token)
    .single()

  if (error || !quote) return null

  const { data: items } = await supabaseAdmin
    .from("quote_items")
    .select("id, type, label, description, quantity, unit_price, order")
    .eq("quote_id", quote.id)
    .order("order", { ascending: true })

  return { ...quote, items: items ?? [] }
}

export async function createQuote(input: CreateQuoteInput) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }

  const token = nanoid(32)

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...input,
      agency_id: agencyId,
      status: "draft",
      token,
      company_id: input.company_id ?? null,
      opportunity_id: input.opportunity_id ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath("/app/quotes")
  return { data }
}

export async function updateQuote(id: string, input: UpdateQuoteInput) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }

  const { data, error } = await supabase
    .from("quotes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/app/quotes/${id}`)
  return { data }
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }

  const { data: current } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .single()

  if (!current) return { error: "Devis introuvable" }

  const allowed = ALLOWED_TRANSITIONS[current.status as QuoteStatus]
  if (!allowed.includes(status)) {
    return { error: `Transition ${current.status} → ${status} non autorisée` }
  }

  const { data, error } = await supabase
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/app/quotes/${id}`)
  revalidatePath("/app/quotes")
  return { data }
}

export async function deleteQuote(id: string) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId)

  if (error) return { error: error.message }
  revalidatePath("/app/quotes")
  return { success: true }
}

export async function addQuoteItem(quoteId: string, item: CreateQuoteItemInput) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  // Verify quote ownership
  const { data: quote } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("agency_id", agencyId)
    .single()

  if (!quote) return { error: "Devis introuvable" }

  const { data, error } = await supabase
    .from("quote_items")
    .insert({ ...item, quote_id: quoteId })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/app/quotes/${quoteId}`)
  return { data }
}

export async function updateQuoteItem(id: string, item: Partial<CreateQuoteItemInput>) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  // Verify ownership via join
  const { data: existing } = await supabase
    .from("quote_items")
    .select("quote_id, quotes!inner(agency_id)")
    .eq("id", id)
    .single()

  if (!existing || (existing.quotes as any).agency_id !== agencyId) {
    return { error: "Non autorisé" }
  }

  const { data, error } = await supabase
    .from("quote_items")
    .update(item)
    .eq("id", id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/app/quotes/${existing.quote_id}`)
  return { data }
}

export async function deleteQuoteItem(id: string) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data: existing } = await supabase
    .from("quote_items")
    .select("quote_id, quotes!inner(agency_id)")
    .eq("id", id)
    .single()

  if (!existing || (existing.quotes as any).agency_id !== agencyId) {
    return { error: "Non autorisé" }
  }

  const { error } = await supabase
    .from("quote_items")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath(`/app/quotes/${existing.quote_id}`)
  return { success: true }
}

export async function reorderQuoteItems(quoteId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data: quote } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("agency_id", agencyId)
    .single()

  if (!quote) return { error: "Devis introuvable" }

  const updates = orderedIds.map((itemId, index) =>
    supabase
      .from("quote_items")
      .update({ order: index })
      .eq("id", itemId)
      .eq("quote_id", quoteId)
  )

  await Promise.all(updates)
  revalidatePath(`/app/quotes/${quoteId}`)
  return { success: true }
}

export async function listOpportunitiesForSelect(search?: string) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()
  let query = supabase
    .from("opportunities")
    .select("id, name, company_id, company:companies(id, name)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(10)
  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`)
  }
  const { data } = await query
  return (data ?? []).map(o => ({
    id: o.id as string,
    name: o.name as string,
    company_id: o.company_id as string | null,
    company: Array.isArray(o.company) ? (o.company[0] ?? null) : (o.company as any ?? null),
  })) as Array<{ id: string; name: string; company_id: string | null; company: { id: string; name: string } | null }>
}

export async function getOpportunityForSelect(id: string) {
  const supabase = await createClient()
  const agencyId = await getAgencyId()
  const { data } = await supabase
    .from("opportunities")
    .select("id, name, company_id, company:companies(id, name)")
    .eq("agency_id", agencyId)
    .eq("id", id)
    .single()
  if (!data) return null
  return {
    id: data.id as string,
    name: data.name as string,
    company_id: data.company_id as string | null,
    company: Array.isArray(data.company) ? (data.company[0] ?? null) : (data.company as any ?? null),
  } as { id: string; name: string; company_id: string | null; company: { id: string; name: string } | null }
}

export async function generateQuoteWithAI({
  quoteId,
  prompt,
}: {
  quoteId: string
  prompt?: string
}): Promise<{
  error?: string
  data?: {
    description: string
    items: Array<{
      type: "fixed" | "hourly" | "expense"
      label: string
      description?: string
      quantity: number
      unit_price: number
    }>
  }
}> {
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const check = await checkQuoteEnabled(agencyId)
  if (!check.allowed) return { error: check.reason }

  const aiCheck = await checkAiEnabled(agencyId)
  if (!aiCheck.allowed) return { error: aiCheck.reason }

  const normalizedPrompt = prompt?.trim() || undefined

  // Fetch quote with opportunity and company context
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, title, opportunity:opportunities(id, name, description, status), company:companies(id, name, business_sector, website, address)")
    .eq("id", quoteId)
    .eq("agency_id", agencyId)
    .single()
  if (!quote) return { error: "Devis introuvable" }

  const opportunity = quote.opportunity as any
  const company = quote.company as any

  // error intentionally ignored — agency config is optional enrichment; generation proceeds without it
  const { data: aiConfig } = await supabase
    .from("agency_ai_configs")
    .select("ai_context, tone, key_points, custom_instructions")
    .eq("agency_id", agencyId)
    .maybeSingle()

  // Build rich context
  const contextParts: string[] = []
  if (company?.name) contextParts.push(`Client : ${company.name}${company.business_sector ? ` (secteur : ${company.business_sector})` : ""}${company.website ? ` — ${company.website}` : ""}`)
  if (opportunity?.name) contextParts.push(`Opportunité : ${opportunity.name}`)
  if (opportunity?.description) contextParts.push(`Description de l'opportunité : ${opportunity.description}`)
  if (quote.title) contextParts.push(`Titre du devis : ${quote.title}`)

  const context = contextParts.length > 0 ? `\n\nContexte disponible :\n${contextParts.join("\n")}` : ""

  const { Mistral } = await import("@mistralai/mistralai")
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })

  const agencyConfigParts: string[] = []
  if (aiConfig?.ai_context) agencyConfigParts.push(`Contexte de l'agence : ${aiConfig.ai_context}`)
  if (aiConfig?.tone) agencyConfigParts.push(`Ton souhaité : ${aiConfig.tone}`)
  if (aiConfig?.key_points) agencyConfigParts.push(`Points clés : ${aiConfig.key_points}`)
  if (aiConfig?.custom_instructions) agencyConfigParts.push(`Instructions supplémentaires : ${aiConfig.custom_instructions}`)
  const agencyConfigSection = agencyConfigParts.length > 0 ? `\n\n${agencyConfigParts.join("\n")}` : ""

  const systemPrompt = `Tu es un expert en rédaction de devis commerciaux pour agences digitales françaises. Tu génères des propositions commerciales professionnelles, précises et convaincantes. Utilise le contexte fourni pour personnaliser le devis. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks.${agencyConfigSection}`

  const intro = normalizedPrompt
    ? `Génère un devis professionnel basé sur la demande suivante :\n"${normalizedPrompt}"`
    : `Génère un devis professionnel basé uniquement sur le contexte ci-dessous.`

  const userPrompt = `${intro}${context}

Retourne un objet JSON avec exactement cette structure :
{
  "description": "Introduction professionnelle du devis (2-3 phrases convaincantes en français, personnalisée selon le contexte)",
  "items": [
    {
      "type": "fixed",
      "label": "Libellé concis",
      "description": "Détail optionnel",
      "quantity": 1,
      "unit_price": 1500
    }
  ]
}

Règles :
- 3 à 7 lignes de devis maximum
- Types possibles : "fixed" (forfait), "hourly" (tarif horaire), "expense" (frais)
- unit_price en euros, sans symbole
- quantity : nombre de jours/heures pour hourly, 1 pour forfait
- Sois précis et professionnel dans les libellés
- Personnalise selon le secteur d'activité du client si disponible`

  const response = await client.chat.complete({
    model: "mistral-small-latest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    responseFormat: { type: "json_object" },
  })

  const text = response.choices?.[0]?.message?.content as string
  if (!text) return { error: "Réponse IA vide" }

  try {
    const parsed = JSON.parse(text)
    return { data: parsed }
  } catch {
    return { error: "Réponse IA invalide" }
  }
}
