import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkProjectLimit, checkMemberLimit, checkAiEnabled, checkTrackingLinkLimit } from "@/lib/billing/checkLimit";

// Mock the Supabase server client — never call real DB in unit tests
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

import { createClient } from "@/lib/supabase/server";

/** Build a fake Supabase client that returns configurable data per table */
function makeMockSupabase(tableData: Record<string, { data?: any; count?: number }>) {
  return {
    from: vi.fn((table: string) => {
      const entry = tableData[table] ?? { data: null, count: 0 };
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: entry.data, error: null })),
      };
      // Make the chain itself awaitable (for count queries that don't call .single())
      const countPromise = Promise.resolve({ data: entry.data, error: null, count: entry.count ?? 0 });
      chain.then = countPromise.then.bind(countPromise);
      chain.catch = countPromise.catch.bind(countPromise);
      chain.finally = countPromise.finally.bind(countPromise);
      return chain;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// checkProjectLimit
// ---------------------------------------------------------------------------
describe("checkProjectLimit", () => {
  it("FREE — autorise si sous la limite (1 projet sur 2)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        projects: { data: null, count: 1 },
      }) as any
    );
    const result = await checkProjectLimit("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("FREE — bloque si à la limite (2 projets sur 2)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        projects: { data: null, count: 2 },
      }) as any
    );
    const result = await checkProjectLimit("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("2 projet");
  });

  it("FREE — bloque si au-dessus de la limite (3 projets)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        projects: { data: null, count: 3 },
      }) as any
    );
    const result = await checkProjectLimit("agency-1");
    expect(result.allowed).toBe(false);
  });

  it("PRO — autorise toujours, peu importe le nombre de projets", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
        projects: { data: null, count: 999 },
      }) as any
    );
    const result = await checkProjectLimit("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("plan manquant → traité comme FREE, bloque à 2", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: null }, // no plan data
        projects: { data: null, count: 2 },
      }) as any
    );
    const result = await checkProjectLimit("agency-1");
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkMemberLimit
// ---------------------------------------------------------------------------
describe("checkMemberLimit", () => {
  it("FREE — autorise si aucun membre (0 sur 1)", async () => {
    // max_members = 1 : count=0 < 1 → allowed
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        profiles: { data: null, count: 0 },
      }) as any
    );
    const result = await checkMemberLimit("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("FREE — bloque dès que le membre owner existe (1 sur 1 = limite atteinte)", async () => {
    // FREE max_members = 1, so count >= 1 → no invitation allowed
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        profiles: { data: null, count: 1 },
      }) as any
    );
    const result = await checkMemberLimit("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("PRO — autorise jusqu'à 6 membres", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
        profiles: { data: null, count: 5 },
      }) as any
    );
    const result = await checkMemberLimit("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("PRO — bloque au-delà de 6 membres", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
        profiles: { data: null, count: 6 },
      }) as any
    );
    const result = await checkMemberLimit("agency-1");
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkAiEnabled
// ---------------------------------------------------------------------------
describe("checkAiEnabled", () => {
  it("FREE — IA désactivée", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
      }) as any
    );
    const result = await checkAiEnabled("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("PRO");
  });

  it("PRO — IA activée", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
      }) as any
    );
    const result = await checkAiEnabled("agency-1");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkTrackingLinkLimit
// ---------------------------------------------------------------------------
describe("checkTrackingLinkLimit", () => {
  it("FREE — autorise si sous la limite (9 liens sur 10)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        tracking_links: { data: null, count: 9 },
      }) as any
    );
    const result = await checkTrackingLinkLimit("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("FREE — bloque si à la limite (10 liens sur 10)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        tracking_links: { data: null, count: 10 },
      }) as any
    );
    const result = await checkTrackingLinkLimit("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("10");
  });

  it("FREE — bloque si au-dessus de la limite (12 liens)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
        tracking_links: { data: null, count: 12 },
      }) as any
    );
    const result = await checkTrackingLinkLimit("agency-1");
    expect(result.allowed).toBe(false);
  });

  it("PRO — autorise toujours, peu importe le nombre de liens", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
        tracking_links: { data: null, count: 999 },
      }) as any
    );
    const result = await checkTrackingLinkLimit("agency-1");
    expect(result.allowed).toBe(true);
  });
});
