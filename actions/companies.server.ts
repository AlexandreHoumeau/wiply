"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  CompanyWithRelations,
  DEFAULT_PAGE_SIZE,
  FetchCompaniesParams,
} from "@/lib/validators/companies";

export async function fetchCompanies({
  agencyId,
  search,
  tab = "all",
  sectors = [],
  sort = "created_at_desc",
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: FetchCompaniesParams) {
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select(
      "id, name, email, phone_number, website, business_sector, created_at, address, billing_address, opportunities(id, status, name, slug), projects(id, status, name, slug)"
    )
    .eq("agency_id", agencyId);

  if (search?.trim()) {
    const q = search.trim();
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,business_sector.ilike.%${q}%`
    );
  }

  if (sectors.length > 0) {
    query = query.in("business_sector", sectors);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur lors de la récupération des entreprises:", error);
    throw new Error("Impossible de charger les entreprises.");
  }

  const all = (data ?? []) as CompanyWithRelations[];

  const clients = all.filter((c) => c.projects.length > 0);
  const prospects = all.filter((c) => c.projects.length === 0);

  const tabFiltered =
    tab === "clients" ? clients : tab === "prospects" ? prospects : all;

  const sorted = [...tabFiltered].sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.name.localeCompare(b.name, "fr");
      case "name_desc":
        return b.name.localeCompare(a.name, "fr");
      case "created_at_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "created_at_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  const total = sorted.length;
  const from = (page - 1) * pageSize;
  const companies = sorted.slice(from, from + pageSize);

  return {
    companies,
    total,
    allCount: all.length,
    clientsCount: clients.length,
    prospectsCount: prospects.length,
  };
}

export async function deleteCompany(companyId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);

  if (error) {
    console.error("Erreur lors de la suppression de l'entreprise:", error);
    throw new Error("Impossible de supprimer l'entreprise.");
  }
}

export async function fetchCompanySectors(agencyId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("companies")
    .select("business_sector")
    .eq("agency_id", agencyId)
    .not("business_sector", "is", null);

  return [
    ...new Set(
      (data ?? []).map((c) => c.business_sector as string).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}

export async function updateCompanyBillingAddress(id: string, billing_address: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single()

  if (!profile?.agency_id) return { error: "Agence introuvable" }

  const { error } = await supabase
    .from("companies")
    .update({ billing_address: billing_address || null })
    .eq("id", id)
    .eq("agency_id", profile.agency_id)

  if (error) return { error: error.message }

  revalidatePath("/app/companies")
  return { success: true }
}
