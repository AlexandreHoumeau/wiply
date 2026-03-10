"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { TaskSlideOver } from "./TaskSlideOver";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/fr";

dayjs.extend(isBetween);

const TYPE_COLORS: Record<string, { bar: string; dot: string }> = {
    feature: { bar: "bg-blue-200",   dot: "bg-blue-500" },
    bug:     { bar: "bg-red-200",    dot: "bg-red-500" },
    design:  { bar: "bg-purple-200", dot: "bg-purple-500" },
    content: { bar: "bg-emerald-200",dot: "bg-emerald-500" },
    setup:   { bar: "bg-slate-200",  dot: "bg-slate-500" },
};

const WINDOW_DAYS = 90;

export function GanttView({ projectId, tasks }: { projectId: string; tasks: any[] }) {
    const router = useRouter();
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [windowStart, setWindowStart] = useState(() => dayjs().startOf("month"));

    const windowEnd = windowStart.add(WINDOW_DAYS - 1, "day");

    const days = useMemo(() => {
        const arr: dayjs.Dayjs[] = [];
        let d = windowStart;
        while (d.isBefore(windowEnd) || d.isSame(windowEnd, "day")) {
            arr.push(d);
            d = d.add(1, "day");
        }
        return arr;
    }, [windowStart, windowEnd]);

    const monthGroups = useMemo(() => {
        const groups: { label: string; count: number }[] = [];
        let current = "";
        let count = 0;
        for (const d of days) {
            const key = d.locale("fr").format("MMMM YYYY");
            if (key !== current) {
                if (current) groups.push({ label: current, count });
                current = key;
                count = 1;
            } else {
                count++;
            }
        }
        if (current) groups.push({ label: current, count });
        return groups;
    }, [days]);

    const todayIndex = days.findIndex((d) => d.isSame(dayjs(), "day"));

    const datedTasks = tasks.filter((t) => t.due_date);
    const undatedTasks = tasks.filter((t) => !t.due_date);

    // Compute bar geometry for each dated task: spans from created_at to due_date
    const taskBars = datedTasks.map((task) => {
        const created = dayjs(task.created_at);
        const due     = dayjs(task.due_date);

        // How many days from windowStart to start/end (can be negative / > WINDOW_DAYS)
        const startOffset = created.diff(windowStart, "day");
        const endOffset   = due.diff(windowStart, "day");

        // Clamp to visible window
        const clampedStart = Math.max(0, startOffset);
        const clampedEnd   = Math.min(days.length - 1, endOffset);

        const startsBeforeWindow = startOffset < 0;
        const endsAfterWindow    = endOffset >= days.length;
        const isFullyOutside     = clampedEnd < 0 || clampedStart >= days.length || clampedStart > clampedEnd;

        // Due date marker index (where the diamond goes)
        const dueDayIndex = endOffset >= 0 && endOffset < days.length ? endOffset : -1;

        return { task, clampedStart, clampedEnd, startsBeforeWindow, endsAfterWindow, isFullyOutside, dueDayIndex };
    });

    const cellW = 32;

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden">
                {/* Navigation */}
                <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200/60">
                    <button
                        onClick={() => setWindowStart((s) => s.subtract(30, "day"))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-slate-700 capitalize min-w-[200px] text-center">
                        {windowStart.locale("fr").format("MMMM YYYY")}
                        {" → "}
                        {windowEnd.locale("fr").format("MMMM YYYY")}
                    </span>
                    <button
                        onClick={() => setWindowStart((s) => s.add(30, "day"))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setWindowStart(dayjs().startOf("month"))}
                        className="ml-2 px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        Aujourd&apos;hui
                    </button>
                    {undatedTasks.length > 0 && (
                        <span className="ml-auto text-xs text-slate-400">
                            {undatedTasks.length} ticket{undatedTasks.length > 1 ? "s" : ""} sans échéance
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-auto">
                    <div style={{ minWidth: 280 + cellW * days.length }}>
                        {/* Month row */}
                        <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
                            <div className="w-[280px] shrink-0 border-r border-slate-200" />
                            {monthGroups.map((g, i) => (
                                <div
                                    key={i}
                                    style={{ width: g.count * cellW }}
                                    className="shrink-0 px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 capitalize border-r border-slate-100"
                                >
                                    {g.label}
                                </div>
                            ))}
                        </div>

                        {/* Day header */}
                        <div className="flex sticky top-[33px] z-20 bg-white border-b border-slate-200">
                            <div className="w-[280px] shrink-0 border-r border-slate-200 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Ticket
                            </div>
                            {days.map((d, i) => (
                                <div
                                    key={i}
                                    style={{ width: cellW }}
                                    className={cn(
                                        "shrink-0 flex items-center justify-center py-1 text-[10px] font-semibold",
                                        d.day() === 0 || d.day() === 6 ? "text-slate-300 bg-slate-50" : "text-slate-400",
                                        d.isSame(dayjs(), "day") ? "text-white bg-[var(--brand-secondary,#6366F1)] rounded-sm" : ""
                                    )}
                                >
                                    {d.date()}
                                </div>
                            ))}
                        </div>

                        {/* Empty state */}
                        {datedTasks.length === 0 && (
                            <div className="px-6 py-12 text-center text-sm text-slate-400">
                                Aucun ticket avec une échéance.<br />
                                <span className="text-xs">Ajoutez une échéance dans l&apos;éditeur de ticket.</span>
                            </div>
                        )}

                        {/* Task rows */}
                        {taskBars.map(({ task, clampedStart, clampedEnd, startsBeforeWindow, endsAfterWindow, isFullyOutside, dueDayIndex }) => {
                            const colors = TYPE_COLORS[task.type ?? "feature"];
                            const isOverdue = dayjs(task.due_date).isBefore(dayjs(), "day") && task.status !== "done";
                            const initials = task.assignee
                                ? getInitials(task.assignee.first_name ?? "", task.assignee.last_name ?? "", task.assignee.email ?? "")
                                : null;

                            const barLeft  = clampedStart * cellW;
                            const barWidth = isFullyOutside ? 0 : Math.max(cellW, (clampedEnd - clampedStart + 1) * cellW);

                            return (
                                <div
                                    key={task.id}
                                    className="flex border-b border-slate-100 hover:bg-slate-50/50 group"
                                    style={{ height: 48 }}
                                >
                                    {/* Task name column */}
                                    <div
                                        className="w-[280px] shrink-0 border-r border-slate-200 flex items-center gap-2 px-4 cursor-pointer"
                                        onClick={() => { setSelectedTask(task); setSlideOverOpen(true); }}
                                    >
                                        {task.assignee && (
                                            <div
                                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                            >
                                                {initials}
                                            </div>
                                        )}
                                        <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-slate-900">
                                            {task.title}
                                        </span>
                                        {isOverdue && (
                                            <span className="ml-auto shrink-0 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                                                En retard
                                            </span>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div className="relative flex items-center" style={{ width: cellW * days.length }}>
                                        {/* Weekend shading */}
                                        {days.map((d, i) => d.day() === 0 || d.day() === 6 ? (
                                            <div key={i} className="absolute top-0 bottom-0 bg-slate-50/70" style={{ left: i * cellW, width: cellW }} />
                                        ) : null)}

                                        {/* Today line */}
                                        {todayIndex >= 0 && (
                                            <div
                                                className="absolute top-0 bottom-0 w-px bg-[var(--brand-secondary,#6366F1)] opacity-25 z-10"
                                                style={{ left: todayIndex * cellW + cellW / 2 }}
                                            />
                                        )}

                                        {/* Span bar (created_at → due_date) */}
                                        {!isFullyOutside && barWidth > 0 && (
                                            <div
                                                className={cn(
                                                    "absolute h-5 rounded-full z-10 cursor-pointer hover:brightness-95 transition-all flex items-center",
                                                    isOverdue ? "bg-red-200" : colors.bar,
                                                    // Flat left edge if starts before window
                                                    startsBeforeWindow ? "rounded-l-none" : "",
                                                    endsAfterWindow    ? "rounded-r-none" : "",
                                                )}
                                                style={{ left: barLeft, width: barWidth }}
                                                title={`Créé le ${dayjs(task.created_at).locale("fr").format("D MMM")} → échéance ${dayjs(task.due_date).locale("fr").format("D MMM YYYY")}`}
                                                onClick={() => { setSelectedTask(task); setSlideOverOpen(true); }}
                                            >
                                                {/* Inline title on bar if wide enough */}
                                                {barWidth > 80 && (
                                                    <span className="px-2 text-[10px] font-semibold text-slate-600 truncate">
                                                        {task.title}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Due date end marker (diamond) */}
                                        {dueDayIndex >= 0 && (
                                            <div
                                                className={cn(
                                                    "absolute w-3 h-3 rounded-sm rotate-45 z-20 shadow-sm",
                                                    isOverdue ? "bg-red-500" : colors.dot
                                                )}
                                                style={{
                                                    left: dueDayIndex * cellW + cellW / 2 - 6,
                                                    top: "50%",
                                                    transform: "translateY(-50%) rotate(45deg)",
                                                }}
                                                title={`Échéance : ${dayjs(task.due_date).locale("fr").format("D MMM YYYY")}`}
                                            />
                                        )}

                                        {/* Created_at start marker */}
                                        {!startsBeforeWindow && (
                                            <div
                                                className="absolute w-2 h-2 rounded-full z-20 bg-white border-2 border-slate-400"
                                                style={{
                                                    left: clampedStart * cellW + cellW / 2 - 4,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                }}
                                                title={`Créé le ${dayjs(task.created_at).locale("fr").format("D MMM YYYY")}`}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Undated tasks */}
                        {undatedTasks.length > 0 && (
                            <>
                                <div className="flex border-b border-slate-200 bg-slate-50">
                                    <div className="w-[280px] shrink-0 border-r border-slate-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        Sans échéance
                                    </div>
                                    <div style={{ width: cellW * days.length }} />
                                </div>
                                {undatedTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                                        style={{ height: 44 }}
                                        onClick={() => { setSelectedTask(task); setSlideOverOpen(true); }}
                                    >
                                        <div className="w-[280px] shrink-0 border-r border-slate-200 flex items-center gap-2 px-4">
                                            <span className="text-xs font-semibold text-slate-500 truncate">{task.title}</span>
                                        </div>
                                        <div style={{ width: cellW * days.length }} className="flex items-center px-6">
                                            <div className="w-full h-px border-t border-dashed border-slate-200" />
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
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
