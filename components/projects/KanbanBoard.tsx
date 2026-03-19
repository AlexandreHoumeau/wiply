"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { updateTaskStatusAndPosition } from "@/actions/task.server";
import { AlignLeft, Bug, LayoutTemplate, PenTool, Settings, ArrowUp, ArrowDown, Equal, AlertOctagon, MessageSquare, CalendarDays, GitBranch } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { cn } from "@/lib/utils";
import { useProject } from "@/providers/project-provider";
import { toast } from "sonner";

// Définition des colonnes du Kanban
const COLUMNS = [
    { id: "todo",        title: "À faire",  color: "bg-muted text-muted-foreground" },
    { id: "in_progress", title: "En cours", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
    { id: "review",      title: "En revue", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" },
    { id: "done",        title: "Terminé",  color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
];

interface KanbanBoardProps {
    projectId: string;
    tasks: any[];
    allTasks: any[];
    onOpenTask: (task: any) => void;
    onNewTask: (status: string) => void;
}

export function KanbanBoard({ projectId, tasks: initialTasks, allTasks, onOpenTask, onNewTask }: KanbanBoardProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);
    const project = useProject() as any;
    const taskPrefix = project?.task_prefix ?? "TCK";

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        const updatedTasks = Array.from(tasks);
        const draggedTaskIndex = updatedTasks.findIndex(t => t.id === draggableId);
        const [draggedTask] = updatedTasks.splice(draggedTaskIndex, 1);

        draggedTask.status = destination.droppableId;
        updatedTasks.splice(destination.index, 0, draggedTask);

        const tasksInDestColumn = updatedTasks.filter(t => t.status === destination.droppableId);
        tasksInDestColumn.forEach((t, idx) => { t.position = idx; });

        setTasks(updatedTasks);

        const res = await updateTaskStatusAndPosition(draggableId, destination.droppableId, destination.index);
        if (!res.success) {
            toast.error("Erreur lors du déplacement");
        }
    };

    if (!isMounted) return <div className="p-8 text-center text-muted-foreground">Chargement de l&apos;espace de travail...</div>;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full overflow-x-auto p-6 gap-6 bg-muted/30">
                {COLUMNS.map((column) => {
                    const columnTasks = tasks
                        .filter(task => task.status === column.id)
                        .sort((a, b) => (a.position || 0) - (b.position || 0));

                    return (
                        <div key={column.id} className="flex flex-col min-w-[320px] w-[320px] bg-muted/50 rounded-2xl border border-border/60 flex-shrink-0">
                            <div className="px-4 bg-card rounded-t-2xl py-3 flex items-center justify-between border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <h3 className="card-title">{column.title}</h3>
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", column.color)}>
                                        {columnTasks.length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onNewTask(column.id)}
                                    className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={cn(
                                            "flex-1 p-3 space-y-3 overflow-y-auto min-h-[150px] transition-colors",
                                            snapshot.isDraggingOver ? "bg-muted" : ""
                                        )}
                                    >
                                        {columnTasks.map((task, index) => {
                                            const subTaskCount = allTasks.filter(t => t.parent_id === task.id).length;
                                            return (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    index={index}
                                                    taskPrefix={taskPrefix}
                                                    subTaskCount={subTaskCount}
                                                    onClick={() => onOpenTask(task)}
                                                />
                                            );
                                        })}
                                        {provided.placeholder}
                                        <button onClick={() => onNewTask(column.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all">
                                            <span>+</span> Ajouter
                                        </button>
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}

function TaskCard({ task, index, taskPrefix, subTaskCount, onClick }: {
    task: any; index: number; taskPrefix: string; subTaskCount: number; onClick: () => void;
}) {
    const TYPE_STYLES: Record<string, { icon: any; label: string; color: string }> = {
        feature: { icon: AlignLeft,      label: "Feature",  color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" },
        bug:     { icon: Bug,            label: "Bug",      color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40" },
        design:  { icon: LayoutTemplate, label: "Design",   color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40" },
        content: { icon: PenTool,        label: "Contenu",  color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
        setup:   { icon: Settings,       label: "Setup",    color: "text-muted-foreground bg-muted" },
    };
    const PRIORITY_ICONS: Record<string, { icon: any; color: string }> = {
        low:    { icon: ArrowDown,    color: "text-muted-foreground" },
        medium: { icon: Equal,        color: "text-muted-foreground" },
        high:   { icon: ArrowUp,      color: "text-orange-500" },
        urgent: { icon: AlertOctagon, color: "text-red-600 dark:text-red-400" },
    };

    const typeConfig = TYPE_STYLES[task.type || "feature"];
    const priorityConfig = PRIORITY_ICONS[task.priority || "medium"];
    const commentCount = task.task_comments?.[0]?.count ?? 0;
    const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), "day") && task.status !== "done";
    const taskSlug = task.task_number ? `${taskPrefix}-${task.task_number}` : task.id.split("-")[0].substring(0, 4).toUpperCase();
    const descPreview = task.description?.replace(/<[^>]*>/g, " ").trim();

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    className={cn(
                        "p-4 rounded-xl border bg-card group hover:border-primary/30 transition-all select-none",
                        snapshot.isDragging ? "shadow-xl scale-[1.02] rotate-1 z-50" : "shadow-sm"
                    )}
                >
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                            {task.parent_id && (
                                <GitBranch className="w-3 h-3 text-muted-foreground/40 rotate-180" />
                            )}
                            <span className="font-mono text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                {taskSlug}
                            </span>
                        </div>
                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", typeConfig.color)}>
                            <typeConfig.icon className="w-2.5 h-2.5" />
                            {typeConfig.label}
                        </div>
                    </div>

                    <p className="font-sans text-[15px] font-semibold text-foreground leading-snug mb-1.5">
                        {task.title}
                    </p>

                    {descPreview && (
                        <p className="font-sans text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                            {descPreview}
                        </p>
                    )}

                    {task.due_date && (
                        <div className={cn(
                            "flex items-center gap-1 mb-3 w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            isOverdue ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground"
                        )}>
                            <CalendarDays className="w-3 h-3" />
                            {dayjs(task.due_date).locale("fr").format("D MMM")}
                            {isOverdue && " · retard"}
                        </div>
                    )}

                    <div className={cn("flex items-center justify-between pt-3 border-t border-border/30", descPreview || task.due_date ? "" : "mt-3")}>
                        <priorityConfig.icon className={cn("w-3.5 h-3.5", priorityConfig.color)} />

                        <div className="flex items-center gap-2">
                            {subTaskCount > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <GitBranch className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">{subTaskCount}</span>
                                </div>
                            )}
                            {commentCount > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">{commentCount}</span>
                                </div>
                            )}
                            {task.assignee ? (
                                <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-background ring-1 ring-border text-white"
                                    style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                >
                                    {task.assignee.first_name?.charAt(0)}{task.assignee.last_name?.charAt(0)}
                                </div>
                            ) : (
                                <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground">
                                    <span className="text-xs">+</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
