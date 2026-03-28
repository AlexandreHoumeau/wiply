import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAgencyTrackingStats, fetchAgencyAnalytics } from "@/actions/tracking.server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

/** Crée une chain Supabase awailable (sans .single()) */
function makeChain(data: any) {
  const p = Promise.resolve({ data, error: null });
  const c: any = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    in: vi.fn(() => c),
    gte: vi.fn(() => c),
    order: vi.fn(() => c),
    limit: vi.fn(() => c),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return c;
}

function mockSupabase(links: any[], clicks: any[]) {
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
// fetchAgencyTrackingStats
// ---------------------------------------------------------------------------
describe("fetchAgencyTrackingStats", () => {
  it("retourne des zéros si aucun lien", async () => {
    mockSupabase([], []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.totalLinks).toBe(0);
    expect(result.totalClicks).toBe(0);
    expect(result.activeLinks).toBe(0);
    expect(result.topLinks).toHaveLength(0);
  });

  it("totalClicks = somme des click_count des liens", async () => {
    const links = [
      { id: "l1", click_count: 10, is_active: true, last_clicked_at: null, short_code: "a", opportunities: null },
      { id: "l2", click_count: 5, is_active: true, last_clicked_at: null, short_code: "b", opportunities: null },
    ];
    mockSupabase(links, []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.totalClicks).toBe(15);
  });

  it("activeLinks = nombre de liens avec is_active=true", async () => {
    const links = [
      { id: "l1", click_count: 0, is_active: true, last_clicked_at: null, short_code: "a", opportunities: null },
      { id: "l2", click_count: 0, is_active: false, last_clicked_at: null, short_code: "b", opportunities: null },
      { id: "l3", click_count: 0, is_active: true, last_clicked_at: null, short_code: "c", opportunities: null },
    ];
    mockSupabase(links, []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.activeLinks).toBe(2);
  });

  it("lastClickedAt = date la plus récente parmi les liens", async () => {
    const links = [
      { id: "l1", click_count: 1, is_active: true, last_clicked_at: "2024-01-01T00:00:00Z", short_code: "a", opportunities: null },
      { id: "l2", click_count: 1, is_active: true, last_clicked_at: "2024-03-15T12:00:00Z", short_code: "b", opportunities: null },
      { id: "l3", click_count: 1, is_active: true, last_clicked_at: "2024-02-10T00:00:00Z", short_code: "c", opportunities: null },
    ];
    mockSupabase(links, []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.lastClickedAt).toBe("2024-03-15T12:00:00Z");
  });

  it("deviceBreakdown comptabilise par type d'appareil depuis les clics", async () => {
    const links = [{ id: "l1", click_count: 3, is_active: true, last_clicked_at: null, short_code: "a", opportunities: null }];
    const clicks = [
      { device_type: "Mobile" },
      { device_type: "Mobile" },
      { device_type: "Desktop" },
    ];
    mockSupabase(links, clicks);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.deviceBreakdown["Mobile"]).toBe(2);
    expect(result.deviceBreakdown["Desktop"]).toBe(1);
  });

  it("null device_type → comptabilisé comme 'Desktop'", async () => {
    const links = [{ id: "l1", click_count: 1, is_active: true, last_clicked_at: null, short_code: "a", opportunities: null }];
    const clicks = [{ device_type: null }];
    mockSupabase(links, clicks);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.deviceBreakdown["Desktop"]).toBe(1);
  });

  it("topLinks : 2 liens sur la même opportunité → fusionnés et triés", async () => {
    const links = [
      { id: "l1", click_count: 10, is_active: true, last_clicked_at: null, short_code: "a", opportunities: { name: "Alpha", slug: "alpha" } },
      { id: "l2", click_count: 5, is_active: false, last_clicked_at: null, short_code: "b", opportunities: { name: "Alpha", slug: "alpha" } },
      { id: "l3", click_count: 8, is_active: true, last_clicked_at: null, short_code: "c", opportunities: { name: "Beta", slug: "beta" } },
    ];
    mockSupabase(links, []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.topLinks[0].opportunity_slug).toBe("alpha");
    expect(result.topLinks[0].click_count).toBe(15); // 10 + 5
    expect(result.topLinks[0].links_count).toBe(2);
    expect(result.topLinks[1].opportunity_slug).toBe("beta");
    expect(result.topLinks[1].click_count).toBe(8);
  });

  it("topLinks limité à 3 éléments", async () => {
    const links = Array.from({ length: 5 }, (_, i) => ({
      id: `l${i}`, click_count: 10 - i, is_active: true, last_clicked_at: null,
      short_code: `code${i}`, opportunities: { name: `Opp ${i}`, slug: `opp-${i}` },
    }));
    mockSupabase(links, []);
    const result = await fetchAgencyTrackingStats("agency-1");
    expect(result.topLinks.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// fetchAgencyAnalytics — agrégations (country, device, topLinks)
// ---------------------------------------------------------------------------
describe("fetchAgencyAnalytics — agrégations", () => {
  const NOW = new Date();
  const recentClick = (country: string, device: string, ip: string) => ({
    tracking_link_id: "l1",
    clicked_at: new Date(NOW.getTime() - 5 * 60e3).toISOString(), // 5 minutes ago
    ip_address: ip,
    country_code: country,
    device_type: device,
    os_type: null,
  });

  it("retourne empty si aucun lien", async () => {
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => makeChain([])) } as any);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    expect(result.totalClicks).toBe(0);
    expect(result.clicksByTime).toHaveLength(0);
  });

  it("countryBreakdown : pourcentages corrects (FR=67%, US=33%)", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 3, opportunities: null }];
    const clicks = [
      recentClick("FR", "Mobile", "1.1.1.1"),
      recentClick("FR", "Desktop", "1.1.1.2"),
      recentClick("US", "Mobile", "1.1.1.3"),
    ];
    mockSupabase(links, clicks);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    const fr = result.countryBreakdown.find((c) => c.code === "FR");
    const us = result.countryBreakdown.find((c) => c.code === "US");
    expect(fr?.pct).toBe(67);
    expect(us?.pct).toBe(33);
  });

  it("countryBreakdown : trié par clics décroissants", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 4, opportunities: null }];
    const clicks = [
      recentClick("DE", "Mobile", "1.1.1.1"),
      recentClick("FR", "Mobile", "1.1.1.2"),
      recentClick("FR", "Mobile", "1.1.1.3"),
      recentClick("FR", "Mobile", "1.1.1.4"),
    ];
    mockSupabase(links, clicks);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    expect(result.countryBreakdown[0].code).toBe("FR");
    expect(result.topCountry).toBe("FR");
  });

  it("uniqueIPs = nombre d'adresses IP distinctes", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 4, opportunities: null }];
    const clicks = [
      recentClick("FR", "Mobile", "1.1.1.1"),
      recentClick("FR", "Mobile", "1.1.1.1"), // doublon
      recentClick("FR", "Desktop", "2.2.2.2"),
      recentClick("US", "Mobile", "3.3.3.3"),
    ];
    mockSupabase(links, clicks);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    expect(result.uniqueIPs).toBe(3);
    expect(result.totalClicks).toBe(4);
  });

  it("clicksByTime : 24 buckets pour range=24h", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 1, opportunities: null }];
    const clicks = [recentClick("FR", "Mobile", "1.1.1.1")];
    mockSupabase(links, clicks);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    expect(result.clicksByTime).toHaveLength(24);
  });

  it("clicksByTime : 7 buckets pour range=7d", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 0, opportunities: null }];
    mockSupabase(links, []);
    const result = await fetchAgencyAnalytics("agency-1", "7d");
    expect(result.clicksByTime).toHaveLength(7);
  });

  it("clicksByTime : 30 buckets pour range=30d", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 0, opportunities: null }];
    mockSupabase(links, []);
    const result = await fetchAgencyAnalytics("agency-1", "30d");
    expect(result.clicksByTime).toHaveLength(30);
  });

  it("sum(clicksByTime) = totalClicks", async () => {
    const links = [{ id: "l1", is_active: true, short_code: "a", click_count: 3, opportunities: null }];
    const clicks = [
      recentClick("FR", "Mobile", "1.1.1.1"),
      recentClick("FR", "Mobile", "1.1.1.2"),
      recentClick("US", "Desktop", "1.1.1.3"),
    ];
    mockSupabase(links, clicks);
    const result = await fetchAgencyAnalytics("agency-1", "24h");
    const bucketTotal = result.clicksByTime.reduce((s, b) => s + b.clicks, 0);
    expect(bucketTotal).toBe(result.totalClicks);
  });
});
