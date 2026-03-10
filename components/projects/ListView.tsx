"use client";

import { useState } from "react";
import {
    AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon,
    Inbox, PlayCircle, Clock, CheckCircle2,
    ChevronUp, ChevronDown,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { TaskSlideOver } from "./TaskSlideOver";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/fr";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    feature: { label: "Feature",  icon: AlignLeft,      color: "text-blue-600 bg-blue-50" },
    bug:     { label: "Bug",      icon: Bug,            color: "text-red-600 bg-red-50" },
    design:  { label: "Design",   icon: LayoutTemplate, color: "text-purple-600 bg-purple-50" },
    content: { label: "Contenu",  icon: PenTool,        color: "text-emerald-600 bg-emerald-50" },
    setup:   { label: "Setup",    icon: Settings,       color: "text-slate-600 bg-slate-100" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    low:    { label: "Basse",   icon: ArrowDown,    color: "text-slate-400" },
    medium: { label: "Moyenne", icon: Equal,        color: "text-slate-500" },
    high:   { label: "Haute",   icon: ArrowUp,      color: "text-orange-500" },
    urgent: { label: "Urgente", icon: AlertOctagon, color: "text-red-600" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    todo:        { label: "À faire",  icon: Inbox,        color: "text-slate-400" },
    in_progress: { label: "En cours", icon: PlayCircle,   color: "text-blue-500" },
    review:      { label: "En revue", icon: Clock,        color: "text-amber-500" },
    done:        { label: "Terminé",  icon: CheckCircle2, color: "text-emerald-500" },
};

type SortKey = "title" | "status" | "type" | "priority" | "assignee" | "due_date" | "created_at";

export function ListView({ projectId, tasks }: { projectId: string; tasks: any[] }) {
    const router = useRouter();
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
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
            case "status":     cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9); break;
            case "type":       cmp = (a.type ?? "").localeCompare(b.type ?? ""); break;
            case "priority":   cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
            case "assignee":   cmp = ((a.assignee?.first_name ?? a.assignee?.email ?? "")).localeCompare(b.assignee?.first_name ?? b.assignee?.email ?? ""); break;
            case "due_date":   cmp = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"); break;
            case "created_at": cmp = (a.created_at ?? "").localeCompare(b.created_at ?? ""); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
    });

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
        return sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 text-slate-600" />
            : <ChevronDown className="w-3 h-3 text-slate-600" />;
    };

    const ColHeader = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
        <th
            onClick={() => handleSort(col)}
            className={cn("px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 select-none whitespace-nowrap", className)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <SortIcon col={col} />
            </span>
        </th>
    );

    return (
        <>
            <div className="h-full overflow-auto bg-slate-50/50">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-200/60">
                        <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 w-16">#</th>
                            <ColHeader col="type"       label="Type"     className="w-28" />
                            <ColHeader col="title"      label="Titre"    />
                            <ColHeader col="status"     label="Statut"   className="w-28" />
                            <ColHeader col="priority"   label="Priorité" className="w-24" />
                            <ColHeader col="assignee"   label="Assigné"  className="w-36" />
                            <ColHeader col="due_date"   label="Échéance" className="w-28" />
                            <ColHeader col="created_at" label="Créé"     className="w-24" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
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

                            return (
                                <tr
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setSlideOverOpen(true); }}
                                    className="bg-white hover:bg-slate-50 cursor-pointer transition-colors group"
                                >
                                    {/* ID */}
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-[10px] font-bold text-slate-300 group-hover:text-slate-400">
                                            {task.id.split("-")[0].substring(0, 4).toUpperCase()}
                                        </span>
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
                                        <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                                        {task.description && (
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
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
                                                <span className="text-xs text-slate-600 truncate">
                                                    {task.assignee.first_name
                                                        ? `${task.assignee.first_name} ${task.assignee.last_name ?? ""}`.trim()
                                                        : task.assignee.email}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>

                                    {/* Due date */}
                                    <td className="px-4 py-3">
                                        {task.due_date ? (
                                            <span className={cn(
                                                "text-xs font-medium",
                                                dayjs(task.due_date).isBefore(dayjs(), "day")
                                                    ? "text-red-500"
                                                    : "text-slate-600"
                                            )}>
                                                {dayjs(task.due_date).locale("fr").format("D MMM")}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>

                                    {/* Created */}
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-400">
                                            {dayjs(task.created_at).locale("fr").format("D MMM")}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TaskSlideOver
                open={slideOverOpen}
                onOpenChange={setSlideOverOpen}
                task={selectedTask}
                projectId={projectId}
                onSaved={() => router.refresh()}
            />
        </>
    );
}
