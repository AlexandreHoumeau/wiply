"use client";

import { useState, useMemo } from "react";
import {
    LayoutGrid, List, GanttChartSquare, CalendarDays,
    AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon, X, ChevronDown,
    Inbox, PlayCircle, Clock, CheckCircle2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KanbanBoard } from "./KanbanBoard";
import { ListView } from "./ListView";
import { GanttView } from "./GanttView";
import { CalendarView } from "./CalendarView";

type View = "board" | "list" | "gantt" | "calendar";

const VIEWS: { id: View; label: string; icon: any }[] = [
    { id: "board",    label: "Board",     icon: LayoutGrid },
    { id: "list",     label: "Liste",     icon: List },
    { id: "gantt",    label: "Gantt",     icon: GanttChartSquare },
    { id: "calendar", label: "Calendrier", icon: CalendarDays },
];

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    feature: { label: "Fonctionnalité", icon: AlignLeft,      color: "bg-blue-50 text-blue-700 border-blue-200" },
    bug:     { label: "Bug",            icon: Bug,            color: "bg-red-50 text-red-700 border-red-200" },
    design:  { label: "Design",         icon: LayoutTemplate, color: "bg-purple-50 text-purple-700 border-purple-200" },
    content: { label: "Contenu",        icon: PenTool,        color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    setup:   { label: "Setup",          icon: Settings,       color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    todo:        { label: "À faire",  icon: Inbox,        color: "bg-slate-100 text-slate-600 border-slate-300" },
    in_progress: { label: "En cours", icon: PlayCircle,   color: "bg-blue-50 text-blue-700 border-blue-200" },
    review:      { label: "En revue", icon: Clock,        color: "bg-amber-50 text-amber-700 border-amber-200" },
    done:        { label: "Terminé",  icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const PRIORITY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    low:    { label: "Basse",   icon: ArrowDown,    color: "bg-slate-50 text-slate-500 border-slate-200" },
    medium: { label: "Moyenne", icon: Equal,        color: "bg-slate-50 text-slate-600 border-slate-200" },
    high:   { label: "Haute",   icon: ArrowUp,      color: "bg-orange-50 text-orange-600 border-orange-200" },
    urgent: { label: "Urgente", icon: AlertOctagon, color: "bg-red-50 text-red-600 border-red-200" },
};

export function BoardContainer({ projectId, initialTasks }: { projectId: string; initialTasks: any[] }) {
    const [view, setView] = useState<View>("board");
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // Unique assignees present in tasks
    const assignees = useMemo(() => {
        const seen = new Map<string, any>();
        for (const t of initialTasks) {
            const key = t.assignee_id ?? "__none__";
            if (!seen.has(key)) seen.set(key, t.assignee ?? null);
        }
        return Array.from(seen.entries()).map(([id, profile]) => ({ id, profile }));
    }, [initialTasks]);

    const hasNoneAssignee = assignees.some((a) => a.id === "__none__");

    const toggle = <T extends string>(arr: T[], val: T): T[] =>
        arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

    const filtered = useMemo(() => initialTasks.filter((t) => {
        if (selectedAssignees.length > 0 && !selectedAssignees.includes(t.assignee_id ?? "__none__")) return false;
        if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false;
        if (selectedPriorities.length > 0 && !selectedPriorities.includes(t.priority)) return false;
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) return false;
        return true;
    }), [initialTasks, selectedAssignees, selectedTypes, selectedPriorities, selectedStatuses]);

    const hasActiveFilter = selectedAssignees.length > 0 || selectedTypes.length > 0 || selectedPriorities.length > 0 || selectedStatuses.length > 0;

    const clearFilters = () => {
        setSelectedAssignees([]);
        setSelectedTypes([]);
        setSelectedPriorities([]);
        setSelectedStatuses([]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* ── Toolbar ──────────────────────────────────────────────── */}
            <div className="shrink-0 bg-background border-b border-slate-200/60 px-6 py-2.5 flex items-center gap-4 flex-wrap">

                {/* View switcher */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 shrink-0">
                    {VIEWS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setView(id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                view === id
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-slate-200 shrink-0" />

                {/* Assignee avatars */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {assignees.map(({ id, profile }) => {
                        const isActive = selectedAssignees.includes(id);
                        if (id === "__none__") {
                            return (
                                <button
                                    key="__none__"
                                    title="Non assigné"
                                    onClick={() => setSelectedAssignees(toggle(selectedAssignees, "__none__"))}
                                    className={cn(
                                        "h-7 w-7 rounded-full border-2 border-dashed flex items-center justify-center text-xs transition-all",
                                        isActive
                                            ? "border-slate-500 bg-slate-200 text-slate-700 ring-2 ring-slate-400 ring-offset-1"
                                            : "border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50 opacity-70 hover:opacity-100"
                                    )}
                                >
                                    ?
                                </button>
                            );
                        }
                        const initials = getInitials(
                            profile?.first_name ?? "",
                            profile?.last_name ?? "",
                            profile?.email ?? ""
                        );
                        return (
                            <button
                                key={id}
                                title={profile?.first_name
                                    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
                                    : profile?.email ?? id}
                                onClick={() => setSelectedAssignees(toggle(selectedAssignees, id))}
                                className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 transition-all",
                                    isActive
                                        ? "border-[var(--brand-secondary,#6366F1)] ring-2 ring-[var(--brand-secondary,#6366F1)] ring-offset-1 scale-110"
                                        : "border-white ring-1 ring-slate-200 opacity-60 hover:opacity-100 hover:scale-105"
                                )}
                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                            >
                                {initials}
                            </button>
                        );
                    })}
                </div>

                <div className="w-px h-5 bg-slate-200 shrink-0" />

                {/* Status dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                            selectedStatuses.length > 0
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                        )}>
                            Statut
                            {selectedStatuses.length > 0 && (
                                <span className="bg-blue-200 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                    {selectedStatuses.length}
                                </span>
                            )}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1.5" align="start">
                        {Object.entries(STATUS_LABELS).map(([val, { label, icon: Icon, color }]) => {
                            const isActive = selectedStatuses.includes(val);
                            return (
                                <button
                                    key={val}
                                    onClick={() => setSelectedStatuses(toggle(selectedStatuses, val))}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        isActive ? cn(color, "border") : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            );
                        })}
                    </PopoverContent>
                </Popover>

                {/* Type dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                            selectedTypes.length > 0
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                        )}>
                            Type
                            {selectedTypes.length > 0 && (
                                <span className="bg-purple-200 text-purple-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                    {selectedTypes.length}
                                </span>
                            )}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1.5" align="start">
                        {Object.entries(TYPE_LABELS).map(([val, { label, icon: Icon, color }]) => {
                            const isActive = selectedTypes.includes(val);
                            return (
                                <button
                                    key={val}
                                    onClick={() => setSelectedTypes(toggle(selectedTypes, val))}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        isActive ? cn(color, "border") : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            );
                        })}
                    </PopoverContent>
                </Popover>

                {/* Priority dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                            selectedPriorities.length > 0
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                        )}>
                            Priorité
                            {selectedPriorities.length > 0 && (
                                <span className="bg-orange-200 text-orange-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                    {selectedPriorities.length}
                                </span>
                            )}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1.5" align="start">
                        {Object.entries(PRIORITY_LABELS).map(([val, { label, icon: Icon, color }]) => {
                            const isActive = selectedPriorities.includes(val);
                            return (
                                <button
                                    key={val}
                                    onClick={() => setSelectedPriorities(toggle(selectedPriorities, val))}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        isActive ? cn(color, "border") : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            );
                        })}
                    </PopoverContent>
                </Popover>

                {/* Clear */}
                {hasActiveFilter && (
                    <button
                        onClick={clearFilters}
                        className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Réinitialiser
                    </button>
                )}

                {/* Task count */}
                <span className={cn(
                    "text-[11px] font-medium text-slate-400 shrink-0",
                    hasActiveFilter ? "" : "ml-auto"
                )}>
                    {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── View ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {view === "board"    && <KanbanBoard projectId={projectId} tasks={filtered} />}
                {view === "list"     && <ListView    projectId={projectId} tasks={filtered} />}
                {view === "gantt"    && <GanttView   projectId={projectId} tasks={filtered} />}
                {view === "calendar" && <CalendarView projectId={projectId} tasks={filtered} />}
            </div>
        </div>
    );
}
