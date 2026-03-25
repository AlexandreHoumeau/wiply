import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkFilesEnabled, checkStorageLimit } from "@/lib/billing/checkLimit";

// Mock both clients
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Re-use the same makeMockSupabase pattern from checkLimit.test.ts
// (copy it here since it's defined locally in that file)
function makeMockSupabase(responses: Record<string, { data: any; error?: any }>) {
  const mocks: Record<string, any> = {};
  for (const [table, resp] of Object.entries(responses)) {
    const chain: any = {};
    const result = Promise.resolve({ data: resp.data, error: resp.error ?? null });
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn(() => result);
    chain.then = result.then.bind(result);
    chain.catch = result.catch.bind(result);
    chain.finally = result.finally.bind(result);
    mocks[table] = chain;
  }
  return {
    from: vi.fn((table: string) => mocks[table]),
  };
}

function makeMockAdminForStorage(usedBytes: number) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
  };
  // Returns rows with `size` field, matching what checkStorageLimit sums via .reduce()
  const result = Promise.resolve({ data: usedBytes > 0 ? [{ size: usedBytes }] : [], error: null });
  chain.then = result.then.bind(result);
  chain.catch = result.catch.bind(result);
  chain.finally = result.finally.bind(result);
  return { from: vi.fn(() => chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkFilesEnabled ──────────────────────────────────────────────────────

describe("checkFilesEnabled", () => {
  it("autorise pour un plan PRO", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("bloque pour un plan FREE", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "FREE" } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("autorise pendant une période d'essai (demo_ends_at dans le futur)", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "FREE", demo_ends_at: futureDate } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(true);
  });

  it("bloque après la fin de la période d'essai (demo_ends_at dans le passé)", async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "FREE", demo_ends_at: pastDate } } }) as any
    );
    const result = await checkFilesEnabled("agency-1");
    expect(result.allowed).toBe(false);
  });
});

// ─── checkStorageLimit ──────────────────────────────────────────────────────

const TWO_GB = 2 * 1024 * 1024 * 1024;

describe("checkStorageLimit", () => {
  it("autorise si sous la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(100_000).from;
    const result = await checkStorageLimit("agency-1", 1_000_000);
    expect(result.allowed).toBe(true);
  });

  it("bloque si l'ajout dépasse la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    // 1.9 GB used + 200 MB file = over 2 GB
    const usedBytes = Math.floor(TWO_GB * 0.95);
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(usedBytes).from;
    const result = await checkStorageLimit("agency-1", 200 * 1024 * 1024);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("autorise si exactement à la limite (equal = still allowed)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    // 0 used + exactly 2 GB file = at the limit → allowed
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(0).from;
    const result = await checkStorageLimit("agency-1", TWO_GB);
    expect(result.allowed).toBe(true);
  });

  it("bloque si 1 byte au-dessus de la limite", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ agencies: { data: { plan: "PRO" } } }) as any
    );
    vi.mocked(supabaseAdmin as any).from = makeMockAdminForStorage(1).from;
    const result = await checkStorageLimit("agency-1", TWO_GB);
    expect(result.allowed).toBe(false);
  });
});
