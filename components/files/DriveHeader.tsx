"use client";

import { FolderPlus, FileUp, Link2, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DriveHeaderProps {
    usedBytes: number;
    limitBytes: number;
    onNewFolder: () => void;
    onUpload: () => void;
    onAddLink: () => void;
}

export function DriveHeader({ usedBytes, limitBytes, onNewFolder, onUpload, onAddLink }: DriveHeaderProps) {
    const pct = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
    const usedMo = Math.round(usedBytes / (1024 * 1024));
    const limitGo = (limitBytes / (1024 * 1024 * 1024)).toFixed(0);

    // Smoother gradient for the "good" state, standard alerts for warnings
    const barColor = 
        pct > 95 ? "bg-red-500 shadow-red-500/50" : 
        pct > 80 ? "bg-amber-500 shadow-amber-500/50" : 
        "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 shadow-indigo-500/30";

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm mb-8">
            
            {/* Storage Info Section */}
            <div className="flex items-center gap-4 w-full sm:max-w-md">
                {/* Decorative Icon */}
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Cloud className="w-5 h-5" />
                </div>
                
                {/* Storage Bar & Text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                            Espace de stockage
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                            <span className="text-foreground font-semibold">{usedMo} Mo</span> / {limitGo} Go
                        </span>
                    </div>
                    
                    {/* Premium Progress Bar with inner shadow for depth */}
                    <div className="h-2 rounded-full bg-primary/20 overflow-hidden shadow-inner">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500 ease-out shadow-sm", barColor)}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onNewFolder}
                    className="flex-1 sm:flex-none bg-background hover:bg-muted border border-border/50 shadow-sm"
                >
                    <FolderPlus className="w-4 h-4 sm:mr-1.5" /> 
                    <span className="hidden sm:inline">Dossier</span>
                </Button>
                
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onAddLink}
                    className="flex-1 sm:flex-none bg-background hover:bg-muted border border-border/50 shadow-sm"
                >
                    <Link2 className="w-4 h-4 sm:mr-1.5" /> 
                    <span className="hidden sm:inline">Lien</span>
                </Button>
                
                {/* Primary Action gets more visual weight */}
                <Button 
                    size="sm" 
                    onClick={onUpload}
                    className="flex-1 sm:flex-none shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                >
                    <FileUp className="w-4 h-4 sm:mr-1.5" /> 
                    <span className="hidden sm:inline">Importer</span>
                </Button>
            </div>
        </div>
    );
}