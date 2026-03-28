import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/billing/checkLimit", () => ({
    getUsedStorageBytes: vi.fn().mockResolvedValue(0),
}));

import { createClient } from "@/lib/supabase/server";
import { getUsedStorageBytes } from "@/lib/billing/checkLimit";
import {
    getFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFileToFolder,
    getStorageUsage,
} from "@/actions/files.server";

/** Minimal supabase chain builder */
function makeChain(result: any) {
    const chain: any = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn(() => chain),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
        single: vi.fn(() => Promise.resolve(result)),
    };
    const p = Promise.resolve(result);
    chain.then = p.then.bind(p);
    chain.catch = p.catch.bind(p);
    chain.finally = p.finally.bind(p);
    return chain;
}

function makeSupabase(config: {
    profileData?: any;
    agencyData?: any;
    tableResults?: Record<string, any>;
}) {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "user-1" } },
                error: null,
            }),
        },
        from: vi.fn((table: string) => {
            if (table === "profiles") {
                return makeChain({ data: { agency_id: "agency-1" }, error: null });
            }
            if (table === "agencies") {
                return makeChain({ data: config.agencyData ?? { plan: "PRO" }, error: null });
            }
            const result = config.tableResults?.[table] ?? { data: [], error: null };
            return makeChain(result);
        }),
    };
}

beforeEach(() => vi.clearAllMocks());

describe("getFolders", () => {
    it("returns folders for the agency", async () => {
        const folders = [
            { id: "f-1", agency_id: "agency-1", name: "Maquettes", created_at: "2026-01-01" },
        ];
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({ tableResults: { folders: { data: folders, error: null } } }) as any
        );
        const result = await getFolders();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data![0].name).toBe("Maquettes");
    });
});

describe("createFolder", () => {
    it("creates a folder and returns the record", async () => {
        const newFolder = { id: "f-2", agency_id: "agency-1", name: "Contrats", created_at: "2026-01-01" };
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({ tableResults: { folders: { data: newFolder, error: null } } }) as any
        );
        const result = await createFolder("Contrats");
        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("f-2");
    });

    it("rejects empty folder name", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({}) as any
        );
        const result = await createFolder("   ");
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe("renameFolder", () => {
    it("rejects rename for folder that belongs to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    folders: { data: { agency_id: "other-agency" }, error: null },
                },
            }) as any
        );
        const result = await renameFolder("f-1", "Nouveau nom");
        expect(result.success).toBe(false);
    });
});

describe("deleteFolder", () => {
    it("rejects delete for folder that belongs to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    folders: { data: { agency_id: "other-agency" }, error: null },
                },
            }) as any
        );
        const result = await deleteFolder("f-1");
        expect(result.success).toBe(false);
    });
});

describe("moveFileToFolder", () => {
    it("rejects move for file belonging to another agency", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    files: { data: { agency_id: "other-agency", project_id: null }, error: null },
                },
            }) as any
        );
        const result = await moveFileToFolder("file-1", "folder-1");
        expect(result.success).toBe(false);
    });

    it("allows move for project-scoped file", async () => {
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                tableResults: {
                    files: { data: { agency_id: "agency-1", project_id: "proj-1" }, error: null },
                    folders: { data: { agency_id: "agency-1", project_id: "proj-1" }, error: null },
                },
            }) as any
        );
        const result = await moveFileToFolder("file-1", "folder-1");
        expect(result.success).toBe(true);
    });
});

describe("getStorageUsage", () => {
    it("returns usedBytes and limitBytes for a PRO agency", async () => {
        vi.mocked(getUsedStorageBytes).mockResolvedValue(500000);
        vi.mocked(createClient).mockResolvedValue(
            makeSupabase({
                agencyData: { plan: "PRO", demo_ends_at: null },
            }) as any
        );
        const result = await getStorageUsage();
        expect(result.success).toBe(true);
        expect(result.data?.usedBytes).toBe(500000);
        expect(result.data?.limitBytes).toBeGreaterThan(0);
    });
});
