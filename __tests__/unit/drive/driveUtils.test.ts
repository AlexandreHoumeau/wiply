import { describe, it, expect } from "vitest";
import { filterFiles, sortFiles } from "@/components/files/driveUtils";
import type { FileRecord } from "@/actions/files.server";

function makeFile(overrides: Partial<FileRecord> = {}): FileRecord {
    return {
        id: "1",
        agency_id: "agency-1",
        project_id: null,
        type: "upload",
        name: "test.pdf",
        storage_path: null,
        url: null,
        size: null,
        mime_type: null,
        uploaded_by: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        folder_id: null,
        uploader: null,
        ...overrides,
    };
}

describe("filterFiles", () => {
    it("returns all files when search is empty and typeFilter is 'all'", () => {
        const files = [makeFile({ name: "a.pdf" }), makeFile({ name: "b.pdf" })];
        expect(filterFiles(files, "", "all")).toHaveLength(2);
    });

    it("filters by name case-insensitively", () => {
        const files = [makeFile({ name: "Contrat.pdf" }), makeFile({ name: "Devis.pdf" })];
        const result = filterFiles(files, "contrat", "all");
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Contrat.pdf");
    });

    it("returns empty when name does not match", () => {
        const files = [makeFile({ name: "Contrat.pdf" })];
        expect(filterFiles(files, "xyz", "all")).toHaveLength(0);
    });

    it("filters by type 'upload'", () => {
        const files = [makeFile({ type: "upload" }), makeFile({ type: "link" })];
        const result = filterFiles(files, "", "upload");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("upload");
    });

    it("filters by type 'link'", () => {
        const files = [makeFile({ type: "upload" }), makeFile({ type: "link" })];
        const result = filterFiles(files, "", "link");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("link");
    });

    it("applies both search and typeFilter", () => {
        const files = [
            makeFile({ name: "Rapport.pdf", type: "upload" }),
            makeFile({ name: "Rapport Figma", type: "link" }),
        ];
        const result = filterFiles(files, "rapport", "upload");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("upload");
    });
});

describe("sortFiles", () => {
    it("does not mutate the original array", () => {
        const files = [makeFile({ name: "Zebra" }), makeFile({ name: "Alpha" })];
        sortFiles(files, "name-asc");
        expect(files[0].name).toBe("Zebra");
    });

    it("sorts name-asc", () => {
        const files = [makeFile({ name: "Zebra" }), makeFile({ name: "Alpha" }), makeFile({ name: "Mango" })];
        expect(sortFiles(files, "name-asc").map((f) => f.name)).toEqual(["Alpha", "Mango", "Zebra"]);
    });

    it("sorts name-desc", () => {
        const files = [makeFile({ name: "Alpha" }), makeFile({ name: "Zebra" })];
        expect(sortFiles(files, "name-desc").map((f) => f.name)).toEqual(["Zebra", "Alpha"]);
    });

    it("sorts date-desc (most recent first)", () => {
        const files = [
            makeFile({ name: "old", created_at: "2026-01-01T00:00:00Z" }),
            makeFile({ name: "new", created_at: "2026-03-01T00:00:00Z" }),
        ];
        expect(sortFiles(files, "date-desc")[0].name).toBe("new");
    });

    it("sorts date-asc (oldest first)", () => {
        const files = [
            makeFile({ name: "old", created_at: "2026-01-01T00:00:00Z" }),
            makeFile({ name: "new", created_at: "2026-03-01T00:00:00Z" }),
        ];
        expect(sortFiles(files, "date-asc")[0].name).toBe("old");
    });

    it("sorts size-desc (largest first)", () => {
        const files = [makeFile({ name: "small", size: 100 }), makeFile({ name: "large", size: 1000 })];
        expect(sortFiles(files, "size-desc")[0].name).toBe("large");
    });

    it("sorts size-asc (smallest first)", () => {
        const files = [makeFile({ name: "large", size: 1000 }), makeFile({ name: "small", size: 100 })];
        expect(sortFiles(files, "size-asc")[0].name).toBe("small");
    });

    it("treats null size as 0 for size sort", () => {
        const files = [makeFile({ name: "has-size", size: 500 }), makeFile({ name: "no-size", size: null })];
        expect(sortFiles(files, "size-desc")[0].name).toBe("has-size");
        expect(sortFiles(files, "size-asc")[0].name).toBe("no-size");
    });
});
