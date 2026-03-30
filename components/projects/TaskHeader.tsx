"use client";

import { ChevronRight, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, STATUS_CONFIG } from "./task-config";
import type { ProjectTask } from "./types";

interface TaskHeaderProps {
    task: ProjectTask | null;
    taskSlug: string | null;
    taskPrefix: string;
    parentTask: ProjectTask | null;
    status: string;
    type: string;
    isOverdue: boolean;
    isLoading: boolean;
    onOpenTask?: (task: ProjectTask) => void;
    onDelete: () => void;
    onSave: () => void;
    onClose: () => void;
}

export function TaskHeader({
    task, taskSlug, taskPrefix, parentTask, status, type,
    isOverdue, isLoading, onOpenTask, onDelete, onSave, onClose,
}: TaskHeaderProps) {
    const TypeIcon = TYPE_CONFIG[type]?.icon;

    return (
        <div className="flex items-center gap-3 px-5 h-[52px] border-b border-border shrink-0">

            {/* Left: breadcrumb + badges */}
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                {task?.parent_id && parentTask && (
                    <>
                        <button
                            onClick={() => onOpenTask?.(parentTask)}
                            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 max-w-[140px]"
                        >
                            <span className="font-mono">{taskPrefix}-{parentTask.task_number}</span>
                            <span className="truncate hidden sm:inline ml-1">{parentTask.title}</span>
                        </button>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                    </>
                )}

                {taskSlug && (
                    <span className="font-mono text-xs font-bold text-muted-foreground/40 border border-border/30 rounded px-1.5 py-0.5 tracking-wider shrink-0">
                        {taskSlug}
                    </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[status]?.dot)} />
                    <span className={cn("text-xs font-semibold hidden sm:inline", STATUS_CONFIG[status]?.color)}>
                        {STATUS_CONFIG[status]?.label}
                    </span>
                </div>

                {TypeIcon && (
                    <span className={cn(
                        "hidden md:flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border shrink-0",
                        TYPE_CONFIG[type]?.chip ?? "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                        <TypeIcon className="w-3 h-3" />
                        {TYPE_CONFIG[type]?.label}
                    </span>
                )}

                {isOverdue && (
                    <span className="hidden sm:flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 shrink-0">
                        En retard
                    </span>
                )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 shrink-0">
                {task && (
                    <button
                        onClick={onDelete}
                        disabled={isLoading}
                        title="Supprimer le ticket"
                        className="p-1.5 rounded-md text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
                <Button
                    onClick={onSave}
                    disabled={isLoading}
                    size="sm"
                    className="h-8 px-4 text-xs font-semibold gap-1.5 ml-1"
                >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {task ? "Enregistrer" : "Créer le ticket"}
                </Button>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors ml-1"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
