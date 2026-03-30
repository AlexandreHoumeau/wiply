import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}));
vi.mock("@/lib/billing/checkLimit", () => ({
  checkFilesEnabled: vi.fn().mockResolvedValue({ allowed: true }),
  checkStorageLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getUsedStorageBytes: vi.fn().mockResolvedValue(0),
}));

import { createClient } from "@/lib/supabase/server";
import {
  addLink,
  createFolder,
  linkFileToTask,
  moveFileToFolder,
  uploadFile,
} from "@/actions/files.server";

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
  const promise = Promise.resolve(result);
  chain.then = promise.then.bind(promise);
  chain.catch = promise.catch.bind(promise);
  chain.finally = promise.finally.bind(promise);
  return chain;
}

function makeSupabase(tableResults: Record<string, any>) {
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
      return makeChain(tableResults[table] ?? { data: null, error: null });
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("files security checks", () => {
  it("rejects creating a project folder for another agency project", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        projects: { data: { id: "project-1", agency_id: "other-agency" }, error: null },
      }) as any
    );

    const result = await createFolder("Assets", "project-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Projet");
  });

  it("rejects uploading a file to a task from a different project", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        projects: { data: { id: "project-1", agency_id: "agency-1" }, error: null },
        tasks: { data: { id: "task-1", agency_id: "agency-1", project_id: "project-2" }, error: null },
      }) as any
    );

    const formData = new FormData();
    formData.append("file", new File(["hello"], "brief.txt", { type: "text/plain" }));
    formData.append("projectId", "project-1");
    formData.append("taskId", "task-1");

    const result = await uploadFile(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ticket");
  });

  it("rejects adding a link to a task from a different project", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        projects: { data: { id: "11111111-1111-4111-8111-111111111111", agency_id: "agency-1" }, error: null },
        tasks: { data: { id: "22222222-2222-4222-8222-222222222222", agency_id: "agency-1", project_id: "33333333-3333-4333-8333-333333333333" }, error: null },
      }) as any
    );

    const result = await addLink(
      "11111111-1111-4111-8111-111111111111",
      "Spec",
      "https://example.com/spec",
      "22222222-2222-4222-8222-222222222222"
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ticket");
  });

  it("rejects linking a project file to a task outside its project", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        files: { data: { agency_id: "agency-1", project_id: "project-1" }, error: null },
        tasks: { data: { id: "task-1", agency_id: "agency-1", project_id: "project-2" }, error: null },
      }) as any
    );

    const result = await linkFileToTask("task-1", "file-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("projet");
  });

  it("rejects moving a file into a folder from another scope", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        files: { data: { agency_id: "agency-1", project_id: "project-1" }, error: null },
        folders: { data: { id: "folder-1", agency_id: "agency-1", project_id: null }, error: null },
      }) as any
    );

    const result = await moveFileToFolder("file-1", "folder-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("même espace");
  });
});
