"use server";

import { PLANS, type PlanId } from "@/lib/config/plans";
import { createClient } from "@/lib/supabase/server";
import { OpportunityStatus } from "@/lib/validators/oppotunities";

export type FavoriteOpp = {
  id: string;
  name: string;
  slug: string;
  status: string;
  company: { name: string } | null;
};

export type RecentProject = {
  id: string;
  name: string;
  slug: string;
  status: string;
  company: { name: string } | null;
};

type DashboardOpportunity = {
  id: string;
  name: string;
  slug: string;
  status: string;
  companies: { name: string | null } | null;
};

export type PipelineRow = {
  status: OpportunityStatus;
  count: number;
};

export type DashboardData = {
  activeOpps: number;
  wonCount: number;
  lostCount: number;
  closedCount: number;
  conversionRate: number | null;
  activeProjectsCount: number;
  totalProjectsCount: number;
  pipelineRows: PipelineRow[];
  pipelineTotal: number;
  favoriteOpps: FavoriteOpp[];
};

export type DashboardActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  tone: "default" | "warning" | "success";
};

export type DashboardSnapshot = {
  sentQuotesCount: number;
  draftQuotesCount: number;
  inProgressTasksCount: number;
  overdueTasksCount: number;
  memberCount: number;
  companyCount: number;
  trackingLinksThisMonth: number;
};

const PIPELINE_STATUSES: OpportunityStatus[] = [
  "inbound",
  "to_do",
  "first_contact",
  "second_contact",
  "proposal_sent",
  "negotiation",
];

export async function getDashboardData(agencyId: string): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    { data: opportunityRows },
    { data: allProjects },
    { data: favoriteOppsData },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("status, is_favorite")
      .eq("agency_id", agencyId),
    supabase
      .from("projects")
      .select("id, status")
      .eq("agency_id", agencyId),
    supabase
      .from("opportunities")
      .select("id, name, slug, status, company:companies(name)")
      .eq("agency_id", agencyId)
      .eq("is_favorite", true)
      .not("status", "in", '("won","lost")')
      .order("updated_at", { ascending: false })
      .limit(4),
  ]);

  const opps = opportunityRows ?? [];
  const wonCount = opps.filter((o) => o.status === "won").length;
  const lostCount = opps.filter((o) => o.status === "lost").length;
  const activeOpps = opps.filter(
    (o) => o.status !== "won" && o.status !== "lost"
  ).length;
  const closedCount = wonCount + lostCount;
  const conversionRate =
    closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : null;

  const projects = allProjects ?? [];
  const activeProjectsCount = projects.filter((p) => p.status === "active").length;

  const pipelineRows = PIPELINE_STATUSES.map((status) => ({
    status,
    count: opps.filter((o) => o.status === status).length,
  })).filter((r) => r.count > 0);

  const pipelineTotal = pipelineRows.reduce((sum, r) => sum + r.count, 0);

  return {
    activeOpps,
    wonCount,
    lostCount,
    closedCount,
    conversionRate,
    activeProjectsCount,
    totalProjectsCount: projects.length,
    pipelineRows,
    pipelineTotal,
    favoriteOpps: (favoriteOppsData ?? []) as unknown as FavoriteOpp[],
  };
}

export async function getDashboardActionItems(agencyId: string): Promise<DashboardActionItem[]> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();

  const [
    { data: agency },
    { count: staleOpportunitiesCount },
    { count: sentQuotesCount },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from("agencies")
      .select("plan, demo_ends_at, logo_url, website, legal_name")
      .eq("id", agencyId)
      .single(),
    supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .not("status", "in", '("won","lost")')
      .lt("updated_at", sevenDaysAgo),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "sent")
      .lt("updated_at", sevenDaysAgo),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId),
  ]);

  const effectivePlan: PlanId =
    agency?.demo_ends_at && new Date(agency.demo_ends_at) > new Date()
      ? "PRO"
      : ((agency?.plan as PlanId | null) ?? "FREE");

  const items: DashboardActionItem[] = [];

  if ((staleOpportunitiesCount ?? 0) > 0) {
    items.push({
      id: "stale-opportunities",
      title: "Relances à reprendre",
      description: `${staleOpportunitiesCount} opportunité${(staleOpportunitiesCount ?? 0) > 1 ? "s" : ""} n'ont pas bougé depuis plus de 7 jours.`,
      href: "/app/opportunities",
      ctaLabel: "Voir le pipeline",
      tone: "warning",
    });
  }

  if ((sentQuotesCount ?? 0) > 0) {
    items.push({
      id: "sent-quotes",
      title: "Devis en attente de retour",
      description: `${sentQuotesCount} devis envoyé${(sentQuotesCount ?? 0) > 1 ? "s" : ""} mérite${(sentQuotesCount ?? 0) > 1 ? "nt" : ""} une relance commerciale.`,
      href: "/app/quotes",
      ctaLabel: "Ouvrir les devis",
      tone: "default",
    });
  }

  if (!agency?.logo_url || !agency.website || !agency.legal_name) {
    const missingFields = [
      !agency?.logo_url ? "logo" : null,
      !agency?.website ? "site web" : null,
      !agency?.legal_name ? "mentions légales" : null,
    ].filter(Boolean);

    items.push({
      id: "agency-profile",
      title: "Finaliser votre agence",
      description: `Complétez ${missingFields.join(", ")} pour renforcer votre image et vos devis.`,
      href: "/app/agency/settings",
      ctaLabel: "Compléter les réglages",
      tone: "default",
    });
  }

  if (effectivePlan === "PRO") {
    const { getUsedStorageBytes } = await import("@/lib/billing/checkLimit");
    const usedBytes = await getUsedStorageBytes(agencyId);
    const limitBytes = PLANS.PRO.max_storage_bytes;
    const usageRatio = limitBytes > 0 ? usedBytes / limitBytes : 0;

    if (usageRatio >= 0.8) {
      items.push({
        id: "storage-usage",
        title: "Stockage bientôt saturé",
        description: `${Math.round(usageRatio * 100)}% du stockage PRO est déjà utilisé dans le drive.`,
        href: "/app/files",
        ctaLabel: "Nettoyer le drive",
        tone: "warning",
      });
    }

    if ((memberCount ?? 0) <= 1) {
      items.push({
        id: "invite-team",
        title: "Inviter votre équipe",
        description: "Vous utilisez encore l'espace seul. Ajoutez un collaborateur pour centraliser delivery et relances.",
        href: "/app/agency/settings",
        ctaLabel: "Inviter un membre",
        tone: "success",
      });
    }
  }

  return items.slice(0, 4);
}

export async function getDashboardSnapshot(agencyId: string): Promise<DashboardSnapshot> {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: sentQuotesCount },
    { count: draftQuotesCount },
    { count: inProgressTasksCount },
    { count: overdueTasksCount },
    { count: memberCount },
    { count: companyCount },
    { count: trackingLinksThisMonth },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "sent"),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "draft"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "in_progress"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .not("status", "eq", "done")
      .lt("due_date", today.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("tracking_links")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  return {
    sentQuotesCount: sentQuotesCount ?? 0,
    draftQuotesCount: draftQuotesCount ?? 0,
    inProgressTasksCount: inProgressTasksCount ?? 0,
    overdueTasksCount: overdueTasksCount ?? 0,
    memberCount: memberCount ?? 0,
    companyCount: companyCount ?? 0,
    trackingLinksThisMonth: trackingLinksThisMonth ?? 0,
  };
}

export type RelanceOpp = {
  id: string;
  name: string;
  slug: string;
  status: string;
  company_name: string | null;
  last_click_at: string;
  clicks_7d: number;
};

export type DashboardEngagement = {
  totalClicks7d: number;
  uniqueProspects7d: number;
  relances: RelanceOpp[];
};

export async function getDashboardEngagement(agencyId: string): Promise<DashboardEngagement> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();

  const { data: links } = await supabase
    .from("tracking_links")
    .select("id, last_clicked_at, opportunities(id, name, slug, status, companies(name))")
    .eq("agency_id", agencyId);

  const empty: DashboardEngagement = { totalClicks7d: 0, uniqueProspects7d: 0, relances: [] };
  if (!links || links.length === 0) return empty;

  const linkIds = links.map((l) => l.id);

  const { data: recentClicks } = await supabase
    .from("tracking_clicks")
    .select("ip_address, tracking_link_id")
    .in("tracking_link_id", linkIds)
    .gte("clicked_at", sevenDaysAgo);

  const allClicks = recentClicks ?? [];
  const totalClicks7d = allClicks.length;
  const uniqueProspects7d = new Set(allClicks.map((c) => c.ip_address).filter(Boolean)).size;

  const clicksByLink = allClicks.reduce(
    (acc, c) => { acc[c.tracking_link_id] = (acc[c.tracking_link_id] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const oppMap = new Map<string, RelanceOpp>();
  for (const link of links) {
    const linkClicks7d = clicksByLink[link.id] ?? 0;
    if (linkClicks7d === 0) continue;

    const opp = link.opportunities as DashboardOpportunity | null;
    if (!opp || opp.status === "won" || opp.status === "lost") continue;

    const existing = oppMap.get(opp.id);
    if (existing) {
      existing.clicks_7d += linkClicks7d;
      if (link.last_clicked_at && new Date(link.last_clicked_at) > new Date(existing.last_click_at)) {
        existing.last_click_at = link.last_clicked_at;
      }
    } else {
      oppMap.set(opp.id, {
        id: opp.id,
        name: opp.name,
        slug: opp.slug,
        status: opp.status,
        company_name: opp.companies?.name ?? null,
        last_click_at: link.last_clicked_at ?? sevenDaysAgo,
        clicks_7d: linkClicks7d,
      });
    }
  }

  const relances = [...oppMap.values()]
    .sort((a, b) => new Date(b.last_click_at).getTime() - new Date(a.last_click_at).getTime())
    .slice(0, 5);

  return { totalClicks7d, uniqueProspects7d, relances };
}

export async function getDashboardRecentProjects(agencyId: string): Promise<RecentProject[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("projects")
    .select("id, name, slug, status, company:companies(name)")
    .eq("agency_id", agencyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []) as unknown as RecentProject[];
}
