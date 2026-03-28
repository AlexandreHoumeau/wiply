import type { FileRecord } from "@/actions/files.server";

export type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";
export type TypeFilter = "all" | "upload" | "link";

export function filterFiles(files: FileRecord[], search: string, typeFilter: TypeFilter): FileRecord[] {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (typeFilter !== "all" && f.type !== typeFilter) return false;
        return true;
    });
}

export function sortFiles(files: FileRecord[], sort: SortKey): FileRecord[] {
    return [...files].sort((a, b) => {
        switch (sort) {
            case "name-asc":  return a.name.localeCompare(b.name);
            case "name-desc": return b.name.localeCompare(a.name);
            case "date-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case "date-asc":  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case "size-desc": return (b.size ?? 0) - (a.size ?? 0);
            case "size-asc":  return (a.size ?? 0) - (b.size ?? 0);
            default: return 0;
        }
    });
}
