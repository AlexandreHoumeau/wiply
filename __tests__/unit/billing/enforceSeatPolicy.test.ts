import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/lib/supabase/admin";
import { enforceAgencySeatPolicy } from "@/lib/billing/enforceSeatPolicy";

type TableState = {
  agencies?: { data?: any; error?: any };
  profiles?: {
    selectData?: any;
    selectError?: any;
    updateError?: any;
  };
  agency_invites?: {
    deleteError?: any;
  };
};

function makeAdminMock(state: TableState) {
  return vi.fn((table: string) => {
    if (table === "agencies") {
      const result = Promise.resolve({
        data: state.agencies?.data ?? null,
        error: state.agencies?.error ?? null,
      });
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => result),
      };
      return chain;
    }

    if (table === "profiles") {
      let mode: "select" | "update" | null = null;
      const selectResult = Promise.resolve({
        data: state.profiles?.selectData ?? [],
        error: state.profiles?.selectError ?? null,
      });
      const updateResult = Promise.resolve({
        error: state.profiles?.updateError ?? null,
      });

      const chain: any = {
        select: vi.fn(() => {
          mode = "select";
          return chain;
        }),
        update: vi.fn(() => {
          mode = "update";
          return chain;
        }),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        then: (...args: any[]) =>
          (mode === "update" ? updateResult : selectResult).then(...args),
        catch: (...args: any[]) =>
          (mode === "update" ? updateResult : selectResult).catch(...args),
        finally: (...args: any[]) =>
          (mode === "update" ? updateResult : selectResult).finally(...args),
      };
      return chain;
    }

    if (table === "agency_invites") {
      const deleteResult = Promise.resolve({
        error: state.agency_invites?.deleteError ?? null,
      });
      const chain: any = {
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        then: deleteResult.then.bind(deleteResult),
        catch: deleteResult.catch.bind(deleteResult),
        finally: deleteResult.finally.bind(deleteResult),
      };
      return chain;
    }

    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enforceAgencySeatPolicy", () => {
  it("does nothing for effective PRO agencies", async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      makeAdminMock({
        agencies: {
          data: { plan: "PRO", demo_ends_at: null, owner_id: "owner-1" },
        },
      }) as any
    );

    await enforceAgencySeatPolicy("agency-1");

    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith("agencies");
  });

  it("removes non-owner members and pending invites for FREE agencies", async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      makeAdminMock({
        agencies: {
          data: { plan: "FREE", demo_ends_at: null, owner_id: "owner-1" },
        },
        profiles: {
          selectData: [{ id: "member-1" }, { id: "member-2" }],
        },
      }) as any
    );

    await enforceAgencySeatPolicy("agency-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("agencies");
    expect(supabaseAdmin.from).toHaveBeenCalledWith("profiles");
    expect(supabaseAdmin.from).toHaveBeenCalledWith("agency_invites");
  });

  it("still clears invites when no extra members remain", async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      makeAdminMock({
        agencies: {
          data: { plan: "FREE", demo_ends_at: null, owner_id: "owner-1" },
        },
        profiles: {
          selectData: [],
        },
      }) as any
    );

    await enforceAgencySeatPolicy("agency-1");

    expect(supabaseAdmin.from).toHaveBeenCalledWith("agency_invites");
  });
});
