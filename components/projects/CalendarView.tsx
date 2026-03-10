"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskSlideOver } from "./TaskSlideOver";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/fr";

dayjs.extend(isoWeek);

const TYPE_COLORS: Record<string, string> = {
    feature: "bg-blue-100 text-blue-700 border-blue-200",
    bug:     "bg-red-100 text-red-700 border-red-200",
    design:  "bg-purple-100 text-purple-700 border-purple-200",
    content: "bg-emerald-100 text-emerald-700 border-emerald-200",
    setup:   "bg-slate-100 text-slate-600 border-slate-200",
};

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendarView({ projectId, tasks }: { projectId: string; tasks: any[] }) {
    const router = useRouter();
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [newTaskDate, setNewTaskDate] = useState<string | undefined>(undefined);
    const [month, setMonth] = useState(() => dayjs().startOf("month"));

    // Build a Mon-first grid
    const grid = useMemo(() => {
        const startOfGrid = month.startOf("month").startOf("isoWeek");
        const endOfGrid = month.endOf("month").endOf("isoWeek");
        const weeks: dayjs.Dayjs[][] = [];
        let week: dayjs.Dayjs[] = [];
        let d = startOfGrid;
        while (d.isBefore(endOfGrid) || d.isSame(endOfGrid, "day")) {
            week.push(d);
            if (week.length === 7) { weeks.push(week); week = []; }
            d = d.add(1, "day");
        }
        if (week.length) weeks.push(week);
        return weeks;
    }, [month]);

    // Normalize due_date → "YYYY-MM-DD" regardless of what Supabase returns
    const tasksByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const t of tasks) {
            if (!t.due_date) continue;
            const key = dayjs(t.due_date).format("YYYY-MM-DD");
            if (!map[key]) map[key] = [];
            map[key].push(t);
        }
        return map;
    }, [tasks]);

    const undatedTasks = tasks.filter((t) => !t.due_date);

    const openNewTask = (dateKey: string) => {
        setSelectedTask(null);
        setNewTaskDate(dateKey);
        setSlideOverOpen(true);
    };

    const openEditTask = (task: any) => {
        setSelectedTask(task);
        setNewTaskDate(undefined);
        setSlideOverOpen(true);
    };

    return (
        <>
            <div className="flex h-full overflow-hidden">
                {/* Calendar */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Month nav */}
                    <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200/60">
                        <button
                            onClick={() => setMonth((m) => m.subtract(1, "month"))}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-slate-700 capitalize min-w-[160px] text-center">
                            {month.locale("fr").format("MMMM YYYY")}
                        </span>
                        <button
                            onClick={() => setMonth((m) => m.add(1, "month"))}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMonth(dayjs().startOf("month"))}
                            className="ml-2 px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                            Ce mois
                        </button>
                        <span className="ml-auto text-xs text-slate-400">Cliquez sur un jour pour créer un ticket</span>
                    </div>

                    {/* Day labels */}
                    <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 bg-white">
                        {DAY_LABELS.map((l) => (
                            <div key={l} className="py-2 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                {l}
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(110px, 1fr)" }}>
                            {grid.flat().map((day, i) => {
                                const key = day.format("YYYY-MM-DD");
                                const dayTasks = tasksByDate[key] ?? [];
                                const isToday = day.isSame(dayjs(), "day");
                                const isCurrentMonth = day.month() === month.month();

                                return (
                                    <div
                                        key={i}
                                        onClick={() => openNewTask(key)}
                                        className={cn(
                                            "border-b border-r border-slate-100 p-1.5 min-h-[110px] group/day cursor-pointer transition-colors",
                                            !isCurrentMonth ? "bg-slate-50/50 hover:bg-slate-100/60" : "bg-white hover:bg-slate-50/80"
                                        )}
                                    >
                                        {/* Day number + add button */}
                                        <div className="flex items-center justify-between mb-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openNewTask(key); }}
                                                className="opacity-0 group-hover/day:opacity-100 h-5 w-5 rounded-md bg-slate-200/80 hover:bg-[var(--brand-secondary,#6366F1)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <span className={cn(
                                                "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                                                isToday
                                                    ? "bg-[var(--brand-secondary,#6366F1)] text-white"
                                                    : isCurrentMonth ? "text-slate-700" : "text-slate-300"
                                            )}>
                                                {day.date()}
                                            </span>
                                        </div>

                                        {/* Tasks */}
                                        <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                                            {dayTasks.slice(0, 3).map((task) => (
                                                <button
                                                    key={task.id}
                                                    onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
                                                    className={cn(
                                                        "w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate border transition-all hover:opacity-80 hover:shadow-sm",
                                                        TYPE_COLORS[task.type ?? "feature"]
                                                    )}
                                                >
                                                    {task.title}
                                                </button>
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <p className="text-[10px] text-slate-400 px-1">
                                                    +{dayTasks.length - 3} de plus
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Undated sidebar */}
                {undatedTasks.length > 0 && (
                    <div className="w-52 shrink-0 border-l border-slate-200/60 bg-slate-50/30 overflow-y-auto">
                        <div className="px-4 py-3 border-b border-slate-200/60">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Sans échéance
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {undatedTasks.length} ticket{undatedTasks.length > 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="p-3 space-y-1.5">
                            {undatedTasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => openEditTask(task)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors hover:opacity-80",
                                        TYPE_COLORS[task.type ?? "feature"]
                                    )}
                                >
                                    <span className="truncate block">{task.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <TaskSlideOver
                open={slideOverOpen}
                onOpenChange={setSlideOverOpen}
                task={selectedTask}
                projectId={projectId}
                initialDueDate={newTaskDate}
                onSaved={() => router.refresh()}
            />
        </>
    );
}
