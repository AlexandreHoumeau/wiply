"use client";

import { GitBranch, Plus, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSubTasksProps {
    task: any;
    taskPrefix: string;
    subTasks: any[];
    doneSubCount: number;
    newSubTitle: string;
    isCreatingSubTask: boolean;
    onNewSubTitleChange: (val: string) => void;
    onCreateSubTask: (e: React.FormEvent) => void;
    onOpenTask?: (task: any) => void;
}

export function TaskSubTasks({
    task, taskPrefix, subTasks, doneSubCount, newSubTitle,
    isCreatingSubTask, onNewSubTitleChange, onCreateSubTask, onOpenTask,
}: TaskSubTasksProps) {
    if (!task) return null;

    return (
        <div className="px-10 pb-8">
            <div className="border-t border-border/30 pt-6">

                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Sous-tâches
                    </span>
                    {subTasks.length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(doneSubCount / subTasks.length) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground/50">
                                {doneSubCount}/{subTasks.length}
                            </span>
                        </div>
                    )}
                </div>

                {/* Subtask list */}
                {subTasks.length > 0 && (
                    <div className="space-y-px mb-3">
                        {subTasks.map((sub) => {
                            const subSlug = sub.task_number ? `${taskPrefix}-${sub.task_number}` : null;
                            const isDone = sub.status === "done";
                            return (
                                <div
                                    key={sub.id}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/40 group/sub transition-colors"
                                >
                                    {/* Decorative circle — not clickable */}
                                    <div className={cn(
                                        "w-3.5 h-3.5 rounded-full border-2 shrink-0",
                                        isDone
                                            ? "bg-emerald-500 border-emerald-500"
                                            : "border-muted-foreground/30"
                                    )} />
                                    <button
                                        onClick={() => onOpenTask?.(sub)}
                                        className={cn(
                                            "flex-1 text-left text-sm transition-colors truncate",
                                            isDone
                                                ? "line-through text-muted-foreground/40"
                                                : "text-foreground/80 hover:text-primary"
                                        )}
                                    >
                                        {subSlug && (
                                            <span className="font-mono text-[10px] text-muted-foreground/30 mr-2">
                                                {subSlug}
                                            </span>
                                        )}
                                        {sub.title}
                                    </button>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-transparent group-hover/sub:text-muted-foreground/30 transition-colors shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Inline create */}
                <form
                    onSubmit={onCreateSubTask}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-border/30 hover:border-border/60 focus-within:border-border/60 transition-colors group/create"
                >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground/25 group-focus-within/create:text-muted-foreground/50 transition-colors shrink-0" />
                    <input
                        value={newSubTitle}
                        onChange={(e) => onNewSubTitleChange(e.target.value)}
                        placeholder="Ajouter une sous-tâche…"
                        disabled={isCreatingSubTask}
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/25 text-foreground"
                    />
                    {newSubTitle.trim() && (
                        <button
                            type="submit"
                            disabled={isCreatingSubTask}
                            className="text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity shrink-0"
                        >
                            {isCreatingSubTask ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ajouter"}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
