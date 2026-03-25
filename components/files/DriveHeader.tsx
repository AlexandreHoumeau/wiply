"use client";

import { FolderPlus, FileUp, Link2, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DriveHeaderProps {
    usedBytes: number;
    limitBytes: number;
    view: "list" | "grid";
    onViewChange: (v: "list" | "grid") => void;
    onNewFolder: () => void;
    onUpload: () => void;
    onAddLink: () => void;
}

export function DriveHeader({ usedBytes, limitBytes, view, onViewChange, onNewFolder, onUpload, onAddLink }: DriveHeaderProps) {
    const pct = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
    const usedMo = Math.round(usedBytes / (1024 * 1024));
    const limitGo = (limitBytes / (1024 * 1024 * 1024)).toFixed(0);

    const barColor = pct > 95 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-violet-500";

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card mb-6">
            {/* Storage bar */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Stockage</span>
                    <span>{usedMo} Mo / {limitGo} Go</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={onNewFolder}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Dossier
                </Button>
                <Button variant="outline" size="sm" onClick={onAddLink}>
                    <Link2 className="w-4 h-4 mr-1.5" /> Lien
                </Button>
                <Button size="sm" onClick={onUpload}>
                    <FileUp className="w-4 h-4 mr-1.5" /> Fichier
                </Button>

                {/* View toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden ml-2">
                    <button
                        className={cn("p-1.5 transition-colors", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange("list")}
                        title="Vue liste"
                        aria-label="Vue liste"
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                        className={cn("p-1.5 transition-colors", view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => onViewChange("grid")}
                        title="Vue grille"
                        aria-label="Vue grille"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
