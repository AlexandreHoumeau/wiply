"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    LayoutGrid, List, GanttChartSquare, CalendarDays,
    AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon, X, ChevronDown, Eye, EyeOff,
    Inbox, PlayCircle, Clock, CheckCircle2,
    type LucideIcon,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KanbanBoard } from "./KanbanBoard";
import { ListView } from "./ListView";
import { GanttView } from "./GanttView";
import { CalendarView } from "./CalendarView";
import { TaskSlideOver } from "./TaskSlideOver";
import type { ProjectTask, ProjectTaskAssignee } from "./types";

type View = "board" | "list" | "gantt" | "calendar";

const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
    { id: "board",    label: "Board",     icon: LayoutGrid },
    { id: "list",     label: "Liste",     icon: List },
    { id: "gantt",    label: "Gantt",     icon: GanttChartSquare },
    { id: "calendar", label: "Calendrier", icon: CalendarDays },
];

const TYPE_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    feature: { label: "Fonctionnalité", icon: AlignLeft,      color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
    bug:     { label: "Bug",            icon: Bug,            color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40" },
    design:  { label: "Design",         icon: LayoutTemplate, color: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
    content: { label: "Contenu",        icon: PenTool,        color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
    setup:   { label: "Setup",          icon: Settings,       color: "bg-muted text-muted-foreground border-border" },
};

const STATUS_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    todo:        { label: "À faire",  icon: Inbox,        color: "bg-muted text-muted-foreground border-border" },
    in_progress: { label: "En cours", icon: PlayCircle,   color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
    review:      { label: "En revue", icon: Clock,        color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40" },
    done:        { label: "Terminé",  icon: CheckCircle2, color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
};

const PRIORITY_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    low:    { label: "Basse",   icon: ArrowDown,    color: "bg-muted text-muted-foreground border-border" },
    medium: { label: "Moyenne", icon: Equal,        color: "bg-muted text-muted-foreground border-border" },
    high:   { label: "Haute",   icon: ArrowUp,      color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40" },
    urgent: { label: "Urgente", icon: AlertOctagon, color: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40" },
};

function BoardContainerInner({ projectId, initialTasks, taskPrefix }: { projectId: string; initialTasks: ProjectTask[]; taskPrefix: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [view, setView] = useState<View>("board");
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [hideReleased, setHideReleased] = useState(true);

    // Lifted slide-over state
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
    const [targetStatus, setTargetStatus] = useState("todo");

    const handleOpenTask = useCallback((task: ProjectTask) => {
        setSelectedTask(task);
        setSlideOverOpen(true);
        if (task?.task_number) {
            router.replace(`${pathname}?task=${taskPrefix}-${task.task_number}`, { scroll: false });
        }
    }, [pathname, router, taskPrefix]);

    const handleOpenNewTask = useCallback((statusId = "todo") => {
        setSelectedTask(null);
        setTargetStatus(statusId);
        setSlideOverOpen(true);
    }, []);

    const handleSlideOverOpenChange = useCallback((open: boolean) => {
        setSlideOverOpen(open);
        if (!open) router.replace(pathname, { scroll: false });
    }, [pathname, router]);

    const handleTaskSaved = useCallback(() => { router.refresh(); }, [router]);

    // On mount: read ?task= and auto-open
    useEffect(() => {
        const taskParam = searchParams.get("task");
        if (!taskParam || initialTasks.length === 0) return;
        const parts = taskParam.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (isNaN(num)) return;
        const task = initialTasks.find((t) => t.task_number === num);
        if (task) { setSelectedTask(task); setSlideOverOpen(true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const assignees = useMemo(() => {
        const seen = new Map<string, ProjectTaskAssignee | null>();
        for (const t of initialTasks) {
            const key = t.assignee_id ?? "__none__";
            if (!seen.has(key)) seen.set(key, t.assignee ?? null);
        }
        return Array.from(seen.entries()).map(([id, profile]) => ({ id, profile }));
    }, [initialTasks]);

    const toggle = <T extends string>(arr: T[], val: T): T[] =>
        arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

    const filtered = useMemo(() => initialTasks.filter((t) => {
        if (hideReleased && t.version?.status === "released") return false;
        if (selectedAssignees.length > 0 && !selectedAssignees.includes(t.assignee_id ?? "__none__")) return false;
        if (selectedTypes.length > 0 && !selectedTypes.includes(t.type ?? "")) return false;
        if (selectedPriorities.length > 0 && !selectedPriorities.includes(t.priority ?? "")) return false;
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status ?? "")) return false;
        return true;
    }), [initialTasks, hideReleased, selectedAssignees, selectedTypes, selectedPriorities, selectedStatuses]);

    const hasActiveFilter = selectedAssignees.length > 0 || selectedTypes.length > 0 || selectedPriorities.length > 0 || selectedStatuses.length > 0;
    const releasedCount = initialTasks.filter((t) => t.version?.status === "released").length;

    const clearFilters = () => {
        setSelectedAssignees([]); setSelectedTypes([]);
        setSelectedPriorities([]); setSelectedStatuses([]);
    };

    return (
        <>
            <div className="flex flex-col h-full">
                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <div className="shrink-0 bg-background border-b border-border/60 px-6 py-2.5 flex items-center gap-4 flex-wrap">

                    {/* View switcher */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 shrink-0">
                        {VIEWS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setView(id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-border shrink-0" />

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
                                                ? "border-muted-foreground bg-muted text-foreground ring-2 ring-muted-foreground ring-offset-1"
                                                : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        ?
                                    </button>
                                );
                            }
                            const initials = getInitials(profile?.first_name ?? "", profile?.last_name ?? "", profile?.email ?? "");
                            return (
                                <button
                                    key={id}
                                    title={profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : profile?.email ?? id}
                                    onClick={() => setSelectedAssignees(toggle(selectedAssignees, id))}
                                    className={cn(
                                        "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 transition-all",
                                        isActive
                                            ? "border-[var(--brand-secondary,#6366F1)] ring-2 ring-[var(--brand-secondary,#6366F1)] ring-offset-1 scale-110"
                                            : "border-background ring-1 ring-border opacity-60 hover:opacity-100 hover:scale-105"
                                    )}
                                    style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                >
                                    {initials}
                                </button>
                            );
                        })}
                    </div>

                    <div className="w-px h-5 bg-border shrink-0" />

                    {/* Status dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                                selectedStatuses.length > 0
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40"
                                    : "text-muted-foreground border-border hover:text-foreground"
                            )}>
                                Statut
                                {selectedStatuses.length > 0 && (
                                    <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                        {selectedStatuses.length}
                                    </span>
                                )}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="start">
                            {Object.entries(STATUS_LABELS).map(([val, { label, icon: Icon, color }]) => (
                                <button key={val} onClick={() => setSelectedStatuses(toggle(selectedStatuses, val))}
                                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        selectedStatuses.includes(val) ? cn(color, "border") : "text-muted-foreground hover:bg-muted"
                                    )}>
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* Type dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                                selectedTypes.length > 0
                                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40"
                                    : "text-muted-foreground border-border hover:text-foreground"
                            )}>
                                Type
                                {selectedTypes.length > 0 && (
                                    <span className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                        {selectedTypes.length}
                                    </span>
                                )}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="start">
                            {Object.entries(TYPE_LABELS).map(([val, { label, icon: Icon, color }]) => (
                                <button key={val} onClick={() => setSelectedTypes(toggle(selectedTypes, val))}
                                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        selectedTypes.includes(val) ? cn(color, "border") : "text-muted-foreground hover:bg-muted"
                                    )}>
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* Priority dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                                selectedPriorities.length > 0
                                    ? "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40"
                                    : "text-muted-foreground border-border hover:text-foreground"
                            )}>
                                Priorité
                                {selectedPriorities.length > 0 && (
                                    <span className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                        {selectedPriorities.length}
                                    </span>
                                )}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="start">
                            {Object.entries(PRIORITY_LABELS).map(([val, { label, icon: Icon, color }]) => (
                                <button key={val} onClick={() => setSelectedPriorities(toggle(selectedPriorities, val))}
                                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        selectedPriorities.includes(val) ? cn(color, "border") : "text-muted-foreground hover:bg-muted"
                                    )}>
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {label}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* Hide released toggle */}
                    {releasedCount > 0 && (
                        <button
                            onClick={() => setHideReleased((v) => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                                !hideReleased
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                                    : "text-muted-foreground border-border hover:text-foreground"
                            )}
                        >
                            {hideReleased ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            Livrés ({releasedCount})
                        </button>
                    )}

                    {/* Clear */}
                    {hasActiveFilter && (
                        <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                            Réinitialiser
                        </button>
                    )}

                    {/* Task count */}
                    <span className={cn("text-[11px] font-medium text-muted-foreground shrink-0", hasActiveFilter ? "" : "ml-auto")}>
                        {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* ── View ─────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-hidden">
                    {view === "board"    && <KanbanBoard _projectId={projectId} tasks={filtered} allTasks={initialTasks} onOpenTask={handleOpenTask} onNewTask={handleOpenNewTask} />}
                    {view === "list"     && <ListView    projectId={projectId} tasks={filtered} allTasks={initialTasks} onOpenTask={(t) => handleOpenTask(t as ProjectTask)} />}
                    {view === "gantt"    && <GanttView   projectId={projectId} tasks={filtered} />}
                    {view === "calendar" && <CalendarView projectId={projectId} tasks={filtered} />}
                </div>
            </div>

            <TaskSlideOver
                open={slideOverOpen}
                onOpenChange={handleSlideOverOpenChange}
                task={selectedTask}
                projectId={projectId}
                allTasks={initialTasks}
                onSaved={handleTaskSaved}
                onOpenTask={(t) => handleOpenTask(t as ProjectTask)}
                initialStatus={targetStatus}
            />
        </>
    );
}

export function BoardContainer({ projectId, initialTasks, taskPrefix = "TCK" }: { projectId: string; initialTasks: ProjectTask[]; taskPrefix?: string }) {
    return (
        <Suspense>
            <BoardContainerInner projectId={projectId} initialTasks={initialTasks} taskPrefix={taskPrefix} />
        </Suspense>
    );
}
