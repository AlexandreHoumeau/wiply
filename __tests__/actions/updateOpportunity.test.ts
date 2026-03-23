import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOpportunity } from "@/actions/opportunity.client";
import type { OpportunityFormValues } from "@/lib/validators/oppotunities";

// Mock the Supabase browser client
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const basePayload: OpportunityFormValues = {
  name: "Refonte site",
  description: "",
  company_name: "ACME Corp",
  company_email: "contact@acme.com",
  company_phone: "",
  company_website: "",
  company_address: "",
  company_sector: "",
  company_links: [],
  status: "first_contact",
  contact_via: "email",
};

/**
 * Build a mock Supabase client that:
 * - Returns `currentStatus` on the first opportunities.select().single() call
 * - Captures all insert() calls into `insertedRows`
 */
function makeMockSupabase(currentStatus: string): {
  supabase: any;
  insertedRows: Array<Record<string, any>>;
} {
  const insertedRows: Array<Record<string, any>> = [];
  let opportunitySelectCount = 0;

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-abc" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => chain),
        insert: vi.fn((data: any) => {
          insertedRows.push({ table, ...data });
          return Promise.resolve({ error: null });
        }),
        single: vi.fn(() => {
          if (table === "opportunities") {
            opportunitySelectCount++;
            if (opportunitySelectCount === 1) {
              // First call: fetch current status + company_id
              return Promise.resolve({
                data: { company_id: "company-xyz", status: currentStatus },
                error: null,
              });
            }
            // Second call: after update
            return Promise.resolve({
              data: { id: "opp-123", name: "Refonte site", status: basePayload.status },
              error: null,
            });
          }
          if (table === "companies") {
            return Promise.resolve({
              data: { id: "company-xyz", name: "ACME Corp" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
      return chain;
    }),
  };

  return { supabase, insertedRows };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Régression : le bon event_type est loggé selon le changement de statut
// ---------------------------------------------------------------------------
describe("updateOpportunity — logging du changement de statut", () => {
  it("log status_changed quand le statut change", async () => {
    const { supabase, insertedRows } = makeMockSupabase("to_do");
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(supabase);

    await updateOpportunity("opp-123", { ...basePayload, status: "first_contact" });

    const statusEvent = insertedRows.find((r) => r.event_type === "status_changed");
    expect(statusEvent).toBeDefined();
    expect(statusEvent?.metadata).toEqual({ from: "to_do", to: "first_contact" });
  });

  it("log info_updated quand le statut ne change pas", async () => {
    const { supabase, insertedRows } = makeMockSupabase("first_contact");
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(supabase);

    await updateOpportunity("opp-123", { ...basePayload, status: "first_contact" });

    const infoEvent = insertedRows.find((r) => r.event_type === "info_updated");
    expect(infoEvent).toBeDefined();
    expect(insertedRows.find((r) => r.event_type === "status_changed")).toBeUndefined();
  });

  it("ne logue pas info_updated lors d'un changement de statut", async () => {
    const { supabase, insertedRows } = makeMockSupabase("to_do");
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(supabase);

    await updateOpportunity("opp-123", { ...basePayload, status: "negotiation" });

    expect(insertedRows.find((r) => r.event_type === "info_updated")).toBeUndefined();
  });

  it("capture correctement from/to pour chaque transition", async () => {
    const transitions = [
      { from: "to_do", to: "first_contact" },
      { from: "first_contact", to: "proposal_sent" },
      { from: "proposal_sent", to: "won" },
      { from: "negotiation", to: "lost" },
    ] as const;

    for (const { from, to } of transitions) {
      const { supabase, insertedRows } = makeMockSupabase(from);
      vi.mocked(createSupabaseBrowserClient).mockReturnValue(supabase);

      await updateOpportunity("opp-123", { ...basePayload, status: to });

      const event = insertedRows.find((r) => r.event_type === "status_changed");
      expect(event?.metadata, `transition ${from} → ${to}`).toEqual({ from, to });
      vi.clearAllMocks();
    }
  });
});
