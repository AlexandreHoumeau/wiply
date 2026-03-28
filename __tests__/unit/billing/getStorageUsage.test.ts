import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUsedStorageBytes } from "@/lib/billing/checkLimit";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/lib/supabase/admin";

beforeEach(() => vi.clearAllMocks());

describe("getUsedStorageBytes", () => {
  it("sums sizes of all upload files for the agency", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({
      data: [{ size: 1024 * 1024 }, { size: 2 * 1024 * 1024 }],
      error: null,
    });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(3 * 1024 * 1024); // 3 MB
  });

  it("returns 0 when no upload files exist", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({ data: [], error: null });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(0);
  });

  it("throws when supabase returns an error", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({ data: null, error: new Error("db failure") });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    await expect(getUsedStorageBytes("agency-1")).rejects.toThrow("db failure");
  });

  it("treats null size as 0", async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain) };
    const dataPromise = Promise.resolve({
      data: [{ size: null }, { size: 500 }],
      error: null,
    });
    chain.then = dataPromise.then.bind(dataPromise);
    chain.catch = dataPromise.catch.bind(dataPromise);
    chain.finally = dataPromise.finally.bind(dataPromise);
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain);

    const result = await getUsedStorageBytes("agency-1");
    expect(result).toBe(500);
  });
});
