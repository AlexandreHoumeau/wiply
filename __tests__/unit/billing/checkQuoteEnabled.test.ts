import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkQuoteEnabled } from "@/lib/billing/checkLimit";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

import { createClient } from "@/lib/supabase/server";

function makeMockSupabase(tableData: Record<string, { data?: any; count?: number }>) {
  return {
    from: vi.fn((table: string) => {
      const entry = tableData[table] ?? { data: null, count: 0 };
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: entry.data, error: null })),
      };
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

describe("checkQuoteEnabled", () => {
  it("FREE — devis désactivés", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "FREE" } },
      }) as any
    );
    const result = await checkQuoteEnabled("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("PRO");
  });

  it("PRO — devis activés", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: { plan: "PRO" } },
      }) as any
    );
    const result = await checkQuoteEnabled("agency-1");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("plan manquant → traité comme FREE, devis désactivés", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({
        agencies: { data: null },
      }) as any
    );
    const result = await checkQuoteEnabled("agency-1");
    expect(result.allowed).toBe(false);
  });
});
