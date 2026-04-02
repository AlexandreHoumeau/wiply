import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildDashboardActivityOverview } from "@/lib/dashboard/activity-overview";
import {
  getDashboardData,
  getDashboardEngagement,
} from "@/actions/dashboard.server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

function makeChain(data: any) {
  const p = Promise.resolve({ data, error: null });
  const c: any = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    in: vi.fn(() => c),
    gte: vi.fn(() => c),
    not: vi.fn(() => c),
    order: vi.fn(() => c),
    limit: vi.fn(() => c),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return c;
}

/**
 * getDashboardData fait 3 queries en Promise.all :
 * 1) opportunities (status, is_favorite)  → opps
 * 2) projects (id, status)                → projects
 * 3) opportunities (favorites)            → favoriteOpps
 */
function mockDashboardData(opps: any[], projects: any[], favoriteOpps: any[] = []) {
  let oppCallCount = 0;
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "opportunities") {
        oppCallCount++;
        return makeChain(oppCallCount === 1 ? opps : favoriteOpps);
      }
      if (table === "projects") return makeChain(projects);
      return makeChain(null);
    }),
  } as any);
}

/**
 * getDashboardEngagement fait 2 queries :
 * 1) tracking_links → links
 * 2) tracking_clicks → clicks
 */
function mockEngagementData(links: any[], clicks: any[]) {
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "tracking_links") return makeChain(links);
      if (table === "tracking_clicks") return makeChain(clicks);
      return makeChain(null);
    }),
  } as any);
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// getDashboardData — taux de conversion
// ---------------------------------------------------------------------------
describe("getDashboardData — taux de conversion", () => {
  it("67% quand 2 gagnées sur 3 fermées", async () => {
    mockDashboardData(
      [
        { status: "won", is_favorite: false },
        { status: "won", is_favorite: false },
        { status: "lost", is_favorite: false },
      ],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.conversionRate).toBe(67); // Math.round(2/3 * 100)
    expect(result.wonCount).toBe(2);
    expect(result.lostCount).toBe(1);
    expect(result.closedCount).toBe(3);
  });

  it("100% quand toutes les fermées sont gagnées", async () => {
    mockDashboardData(
      [{ status: "won", is_favorite: false }, { status: "won", is_favorite: false }],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.conversionRate).toBe(100);
  });

  it("0% quand toutes les fermées sont perdues", async () => {
    mockDashboardData(
      [{ status: "lost", is_favorite: false }, { status: "lost", is_favorite: false }],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.conversionRate).toBe(0);
  });

  it("null quand aucune opportunité fermée", async () => {
    mockDashboardData(
      [{ status: "first_contact", is_favorite: false }],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.conversionRate).toBeNull();
  });

  it("null si aucune opportunité du tout", async () => {
    mockDashboardData([], []);
    const result = await getDashboardData("agency-1");
    expect(result.conversionRate).toBeNull();
    expect(result.activeOpps).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getDashboardData — pipeline et comptages
// ---------------------------------------------------------------------------
describe("getDashboardData — pipeline", () => {
  it("activeOpps exclut won et lost", async () => {
    mockDashboardData(
      [
        { status: "first_contact", is_favorite: false },
        { status: "negotiation", is_favorite: false },
        { status: "won", is_favorite: false },
        { status: "lost", is_favorite: false },
      ],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.activeOpps).toBe(2);
  });

  it("pipelineRows ne contient pas won ni lost", async () => {
    mockDashboardData(
      [
        { status: "to_do", is_favorite: false },
        { status: "to_do", is_favorite: false },
        { status: "first_contact", is_favorite: false },
        { status: "won", is_favorite: false },
        { status: "lost", is_favorite: false },
      ],
      []
    );
    const result = await getDashboardData("agency-1");
    const statuses = result.pipelineRows.map((r) => r.status);
    expect(statuses).not.toContain("won");
    expect(statuses).not.toContain("lost");
    expect(result.pipelineRows.find((r) => r.status === "to_do")?.count).toBe(2);
  });

  it("pipelineRows exclut les statuts avec count=0", async () => {
    mockDashboardData(
      [{ status: "first_contact", is_favorite: false }],
      []
    );
    const result = await getDashboardData("agency-1");
    // Seul first_contact a un count > 0
    expect(result.pipelineRows.every((r) => r.count > 0)).toBe(true);
    expect(result.pipelineRows).toHaveLength(1);
  });

  it("pipelineTotal = somme des counts pipeline", async () => {
    mockDashboardData(
      [
        { status: "to_do", is_favorite: false },
        { status: "first_contact", is_favorite: false },
        { status: "first_contact", is_favorite: false },
      ],
      []
    );
    const result = await getDashboardData("agency-1");
    expect(result.pipelineTotal).toBe(3);
  });

  it("activeProjectsCount = projets avec status=active", async () => {
    mockDashboardData([], [
      { id: "p1", status: "active" },
      { id: "p2", status: "active" },
      { id: "p3", status: "archived" },
    ]);
    const result = await getDashboardData("agency-1");
    expect(result.activeProjectsCount).toBe(2);
    expect(result.totalProjectsCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getDashboardEngagement — relances et métriques 7j
// ---------------------------------------------------------------------------
describe("getDashboardEngagement", () => {
  const link = (id: string, oppId: string, oppStatus: string, lastClicked: string) => ({
    id,
    last_clicked_at: lastClicked,
    opportunities: { id: oppId, name: `Opp ${oppId}`, slug: oppId, status: oppStatus, companies: null },
  });

  const click = (linkId: string, ip: string) => ({
    tracking_link_id: linkId,
    ip_address: ip,
  });

  it("retourne empty si aucun lien de tracking", async () => {
    mockEngagementData([], []);
    const result = await getDashboardEngagement("agency-1");
    expect(result.totalClicks7d).toBe(0);
    expect(result.uniqueProspects7d).toBe(0);
    expect(result.relances).toHaveLength(0);
  });

  it("totalClicks7d = nombre total de clics récents", async () => {
    mockEngagementData(
      [link("l1", "opp-1", "first_contact", new Date().toISOString())],
      [click("l1", "1.1.1.1"), click("l1", "1.1.1.2"), click("l1", "1.1.1.3")]
    );
    const result = await getDashboardEngagement("agency-1");
    expect(result.totalClicks7d).toBe(3);
  });

  it("uniqueProspects7d = IPs distinctes", async () => {
    mockEngagementData(
      [link("l1", "opp-1", "first_contact", new Date().toISOString())],
      [
        click("l1", "1.1.1.1"),
        click("l1", "1.1.1.1"), // doublon
        click("l1", "2.2.2.2"),
      ]
    );
    const result = await getDashboardEngagement("agency-1");
    expect(result.uniqueProspects7d).toBe(2);
  });

  it("exclut les opportunités won et lost des relances", async () => {
    mockEngagementData(
      [
        link("l1", "opp-won", "won", new Date().toISOString()),
        link("l2", "opp-lost", "lost", new Date().toISOString()),
        link("l3", "opp-active", "first_contact", new Date().toISOString()),
      ],
      [
        click("l1", "1.1.1.1"),
        click("l2", "2.2.2.2"),
        click("l3", "3.3.3.3"),
      ]
    );
    const result = await getDashboardEngagement("agency-1");
    expect(result.relances).toHaveLength(1);
    expect(result.relances[0].id).toBe("opp-active");
  });

  it("2 liens de la même opportunité → fusionnés dans relances", async () => {
    mockEngagementData(
      [
        link("l1", "opp-1", "negotiation", "2024-01-02T10:00:00Z"),
        link("l2", "opp-1", "negotiation", "2024-01-03T10:00:00Z"), // même opp, date plus récente
      ],
      [click("l1", "1.1.1.1"), click("l2", "2.2.2.2")]
    );
    const result = await getDashboardEngagement("agency-1");
    expect(result.relances).toHaveLength(1);
    expect(result.relances[0].clicks_7d).toBe(2);
    // last_click_at doit être la plus récente
    expect(result.relances[0].last_click_at).toBe("2024-01-03T10:00:00Z");
  });

  it("relances triées par last_click_at décroissant", async () => {
    mockEngagementData(
      [
        link("l1", "opp-old", "first_contact", "2024-01-01T00:00:00Z"),
        link("l2", "opp-new", "first_contact", "2024-01-05T00:00:00Z"),
      ],
      [click("l1", "1.1.1.1"), click("l2", "2.2.2.2")]
    );
    const result = await getDashboardEngagement("agency-1");
    expect(result.relances[0].id).toBe("opp-new");
    expect(result.relances[1].id).toBe("opp-old");
  });
});

describe("buildDashboardActivityOverview", () => {
  const now = new Date("2026-04-01T10:00:00Z");

  it("regroupe les actions par jour et calcule le resume du jour", () => {
    const result = buildDashboardActivityOverview(
      [
        { key: "task_comment", created_at: "2026-04-01T08:00:00Z" },
        { key: "task_comment", created_at: "2026-04-01T09:00:00Z" },
        { key: "status_changed", created_at: "2026-04-01T11:00:00Z" },
        { key: "note_added", created_at: "2026-03-31T14:00:00Z" },
        { key: "task_created", created_at: "2026-03-30T14:00:00Z" },
      ],
      now
    );

    expect(result.today.total).toBe(3);
    expect(result.today.metrics[0]).toMatchObject({
      key: "task_comment",
      count: 2,
    });
    expect(result.today.summary).toContain("3 actions");
    expect(result.recentDays[0]).toMatchObject({
      shortLabel: "Hier",
      total: 1,
    });
    expect(result.totalLast7Days).toBe(5);
    expect(result.activeDays).toBe(3);
    expect(result.topActivityLabel).toBe("commentaire");
  });

  it("inclut les jours vides dans la fenetre et reste vide sans activite", () => {
    const result = buildDashboardActivityOverview([], now);

    expect(result.today.total).toBe(0);
    expect(result.today.metrics).toHaveLength(0);
    expect(result.recentDays).toHaveLength(6);
    expect(result.recentDays.every((day) => day.total === 0)).toBe(true);
    expect(result.totalLast7Days).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.topActivityLabel).toBeNull();
  });
});
