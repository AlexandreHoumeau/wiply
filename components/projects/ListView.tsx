"use client";

import { useState } from "react";
import {
    AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon,
    Inbox, PlayCircle, Clock, CheckCircle2,
    ChevronUp, ChevronDown, GitBranch,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useProject } from "@/providers/project-provider";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import type { LucideIcon } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    feature: { label: "Feature",  icon: AlignLeft,      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" },
    bug:     { label: "Bug",      icon: Bug,            color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40" },
    design:  { label: "Design",   icon: LayoutTemplate, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40" },
    content: { label: "Contenu",  icon: PenTool,        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
    setup:   { label: "Setup",    icon: Settings,       color: "text-muted-foreground bg-muted" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    low:    { label: "Basse",   icon: ArrowDown,    color: "text-muted-foreground" },
    medium: { label: "Moyenne", icon: Equal,        color: "text-muted-foreground" },
    high:   { label: "Haute",   icon: ArrowUp,      color: "text-orange-500" },
    urgent: { label: "Urgente", icon: AlertOctagon, color: "text-red-600 dark:text-red-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    todo:        { label: "À faire",  icon: Inbox,        color: "text-muted-foreground" },
    in_progress: { label: "En cours", icon: PlayCircle,   color: "text-blue-500" },
    review:      { label: "En revue", icon: Clock,        color: "text-amber-500" },
    done:        { label: "Terminé",  icon: CheckCircle2, color: "text-emerald-500" },
};

type SortKey = "title" | "status" | "type" | "priority" | "assignee" | "due_date" | "created_at";

interface ListViewProps {
    projectId: string;
    tasks: Array<{
        id: string;
        title: string;
        status?: string | null;
        type?: string | null;
        priority?: string | null;
        due_date?: string | null;
        created_at?: string | null;
        description?: string | null;
        parent_id?: string | null;
        task_number?: number | null;
        assignee?: {
            first_name?: string | null;
            last_name?: string | null;
            email?: string | null;
        } | null;
    }>;
    allTasks: Array<{ id: string; parent_id?: string | null }>;
    onOpenTask: (task: ListViewProps["tasks"][number]) => void;
}

function SortIcon({
    col,
    sortKey,
    sortDir,
}: {
    col: SortKey;
    sortKey: SortKey;
    sortDir: "asc" | "desc";
}) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-muted-foreground/30" />;
    return sortDir === "asc"
        ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
        : <ChevronDown className="w-3 h-3 text-muted-foreground" />;
}

function ColumnHeader({
    col,
    label,
    className,
    onSort,
    sortKey,
    sortDir,
}: {
    col: SortKey;
    label: string;
    className?: string;
    onSort: (col: SortKey) => void;
    sortKey: SortKey;
    sortDir: "asc" | "desc";
}) {
    return (
        <th
            onClick={() => onSort(col)}
            className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap", className)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </span>
        </th>
    );
}

export function ListView({ projectId: _projectId, tasks, allTasks, onOpenTask }: ListViewProps) {
    const project = useProject();
    const taskPrefix = project?.task_prefix ?? "TCK";
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    };

    const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const STATUS_ORDER: Record<string, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };

    const sorted = [...tasks].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
            case "title":      cmp = (a.title ?? "").localeCompare(b.title ?? ""); break;
            case "status":     cmp = (STATUS_ORDER[a.status ?? ""] ?? 9) - (STATUS_ORDER[b.status ?? ""] ?? 9); break;
            case "type":       cmp = (a.type ?? "").localeCompare(b.type ?? ""); break;
            case "priority":   cmp = (PRIORITY_ORDER[a.priority ?? ""] ?? 9) - (PRIORITY_ORDER[b.priority ?? ""] ?? 9); break;
            case "assignee":   cmp = ((a.assignee?.first_name ?? a.assignee?.email ?? "")).localeCompare(b.assignee?.first_name ?? b.assignee?.email ?? ""); break;
            case "due_date":   cmp = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"); break;
            case "created_at": cmp = (a.created_at ?? "").localeCompare(b.created_at ?? ""); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
    });

    return (
        <div className="h-full overflow-auto bg-muted/20">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead className="sticky top-0 z-10 bg-background border-b border-border/60">
                        <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-16">#</th>
                            <ColumnHeader col="type" label="Type" className="w-28" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="title" label="Titre" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="status" label="Statut" className="w-28" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="priority" label="Priorité" className="w-24" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="assignee" label="Assigné" className="w-36" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="due_date" label="Échéance" className="w-28" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                            <ColumnHeader col="created_at" label="Créé" className="w-24" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                    Aucun ticket ne correspond aux filtres actifs.
                                </td>
                            </tr>
                        )}
                        {sorted.map((task) => {
                            const typeConf = TYPE_CONFIG[task.type ?? "feature"];
                            const priorityConf = PRIORITY_CONFIG[task.priority ?? "medium"];
                            const statusConf = STATUS_CONFIG[task.status ?? "todo"];
                            const TypeIcon = typeConf.icon;
                            const PriorityIcon = priorityConf.icon;
                            const StatusIcon = statusConf.icon;
                            const initials = task.assignee
                                ? getInitials(task.assignee.first_name ?? "", task.assignee.last_name ?? "", task.assignee.email ?? "")
                                : null;
                            const taskSlug = task.task_number ? `${taskPrefix}-${task.task_number}` : task.id.split("-")[0].substring(0, 4).toUpperCase();
                            const subTaskCount = allTasks.filter(t => t.parent_id === task.id).length;

                            return (
                                <tr
                                    key={task.id}
                                    onClick={() => onOpenTask(task)}
                                    className="bg-background hover:bg-muted/40 cursor-pointer transition-colors group"
                                >
                                    {/* ID */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {task.parent_id && (
                                                <GitBranch className="w-3 h-3 text-muted-foreground/30 rotate-180 shrink-0" />
                                            )}
                                            <span className="font-mono text-[10px] font-bold text-muted-foreground/40 group-hover:text-muted-foreground">
                                                {taskSlug}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Type */}
                                    <td className="px-4 py-3">
                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", typeConf.color)}>
                                            <TypeIcon className="w-3 h-3" />
                                            {typeConf.label}
                                        </span>
                                    </td>

                                    {/* Title */}
                                    <td className="px-4 py-3 max-w-[320px]">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                                            {subTaskCount > 0 && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                                                    <GitBranch className="w-3 h-3" />
                                                    {subTaskCount}
                                                </span>
                                            )}
                                        </div>
                                        {task.description && (
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {task.description.replace(/<[^>]*>/g, " ").trim()}
                                            </p>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", statusConf.color)}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {statusConf.label}
                                        </span>
                                    </td>

                                    {/* Priority */}
                                    <td className="px-4 py-3">
                                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", priorityConf.color)}>
                                            <PriorityIcon className="w-3.5 h-3.5" />
                                            {priorityConf.label}
                                        </span>
                                    </td>

                                    {/* Assignee */}
                                    <td className="px-4 py-3">
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                                    style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                                >
                                                    {initials}
                                                </div>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {task.assignee.first_name
                                                        ? `${task.assignee.first_name} ${task.assignee.last_name ?? ""}`.trim()
                                                        : task.assignee.email}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/30">—</span>
                                        )}
                                    </td>

                                    {/* Due date */}
                                    <td className="px-4 py-3">
                                        {task.due_date ? (
                                            <span className={cn(
                                                "text-xs font-medium",
                                                dayjs(task.due_date).isBefore(dayjs(), "day")
                                                    ? "text-red-500"
                                                    : "text-muted-foreground"
                                            )}>
                                                {dayjs(task.due_date).locale("fr").format("D MMM")}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/30">—</span>
                                        )}
                                    </td>

                                    {/* Created */}
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-muted-foreground">
                                            {dayjs(task.created_at).locale("fr").format("D MMM")}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
        </div>
    );
}
