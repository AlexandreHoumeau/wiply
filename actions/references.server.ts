"use server"

import { createClient } from "@/lib/supabase/server"

export type EntityRef = {
  entityType: "ticket" | "opportunity" | "project" | "quote"
  id: string
  label: string
  projectSlug?: string // tickets only — needed for navigation
}

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

export async function searchTickets(query: string): Promise<EntityRef[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data } = await supabase
    .from("tasks")
    .select("id, title, task_number, project:projects(task_prefix, slug)")
    .eq("agency_id", agencyId)
    .ilike("title", `%${query.trim()}%`)
    .limit(8)

  if (!data) return []
  return data.map((t) => {
    type ProjectRow = { task_prefix: string; slug: string }
    const project: ProjectRow | null = Array.isArray(t.project) ? (t.project[0] as ProjectRow) : (t.project as ProjectRow | null)
    const prefix = project?.task_prefix ?? ""
    const slug = project?.slug ?? ""
    const ref = prefix ? `${prefix}-${t.task_number}` : String(t.task_number)
    return {
      entityType: "ticket" as const,
      id: t.id,
      label: `${ref}: ${t.title}`,
      projectSlug: slug,
    }
  })
}

export async function searchOpportunities(query: string): Promise<EntityRef[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data } = await supabase
    .from("opportunities")
    .select("slug, name")
    .eq("agency_id", agencyId)
    .ilike("name", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(8)

  if (!data) return []
  return data.map((o) => ({
    entityType: "opportunity" as const,
    id: o.slug,
    label: o.name,
  }))
}

export async function searchProjects(query: string): Promise<EntityRef[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data } = await supabase
    .from("projects")
    .select("slug, name")
    .eq("agency_id", agencyId)
    .ilike("name", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(8)

  if (!data) return []
  return data.map((p) => ({
    entityType: "project" as const,
    id: p.slug,
    label: p.name,
  }))
}

export async function searchQuotes(query: string): Promise<EntityRef[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const agencyId = await getAgencyId()

  const { data } = await supabase
    .from("quotes")
    .select("id, title")
    .eq("agency_id", agencyId)
    .ilike("title", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(8)

  if (!data) return []
  return data.map((q) => ({
    entityType: "quote" as const,
    id: q.id,
    label: q.title,
  }))
}
