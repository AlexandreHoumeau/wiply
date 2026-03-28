"use server";

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
