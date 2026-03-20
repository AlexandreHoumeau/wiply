"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { checkQuoteEnabled } from "@/lib/billing/checkLimit"
import {
  CreateQuoteInput,
  UpdateQuoteInput,
  CreateQuoteItemInput,
  UpdateQuoteItemSchema,
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
