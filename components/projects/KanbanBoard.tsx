"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { updateTaskStatusAndPosition } from "@/actions/task.server";
import { AlignLeft, Bug, LayoutTemplate, PenTool, Settings, ArrowUp, ArrowDown, Equal, AlertOctagon, MessageSquare, CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TaskSlideOver } from "./TaskSlideOver";

// Définition des colonnes du Kanban
const COLUMNS = [
    { id: "todo", title: "À faire", color: "bg-slate-200 text-slate-700" },
    { id: "in_progress", title: "En cours", color: "bg-blue-100 text-blue-700" },
    { id: "review", title: "En revue", color: "bg-amber-100 text-amber-700" },
    { id: "done", title: "Terminé", color: "bg-emerald-100 text-emerald-700" },
];

export function KanbanBoard({ projectId, tasks: initialTasks }: { projectId: string, tasks: any[] }) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [tasks, setTasks] = useState(initialTasks);

    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [targetStatus, setTargetStatus] = useState("todo");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Si lâché en dehors d'une zone droppable ou à la même place
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        // Mise à jour optimiste du state (UI d'abord)
        const updatedTasks = Array.from(tasks);
        const draggedTaskIndex = updatedTasks.findIndex(t => t.id === draggableId);
        const [draggedTask] = updatedTasks.splice(draggedTaskIndex, 1);

        draggedTask.status = destination.droppableId;
        updatedTasks.splice(destination.index, 0, draggedTask);

        // Mettre à jour l'ordre (position) pour tous les items de la colonne
        const tasksInDestColumn = updatedTasks.filter(t => t.status === destination.droppableId);
        tasksInDestColumn.forEach((t, idx) => { t.position = idx; });

        setTasks(updatedTasks);

        // Appel API en arrière-plan
        const res = await updateTaskStatusAndPosition(draggableId, destination.droppableId, destination.index);
        if (!res.success) {
            toast.error("Erreur lors du déplacement");
            // Idéalement, on revert le state ici en cas d'erreur
        }
    };

    const handleOpenNewTask = (statusId: string = "todo") => {
        setSelectedTask(null);
        setSlideOverOpen(true);
        setTargetStatus(statusId);
    };

    const handleOpenEditTask = (task: any) => {
        setSelectedTask(task);
        setSlideOverOpen(true);
    };

    const handleTaskSaved = () => {
        router.refresh();
    };

    if (!isMounted) return <div className="p-8 text-center text-slate-400">Chargement de l'espace de travail...</div>;

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full overflow-x-auto p-6 gap-6 bg-slate-50/50">
                    {COLUMNS.map((column) => {
                        const columnTasks = tasks
                            .filter(task => task.status === column.id)
                            .sort((a, b) => (a.position || 0) - (b.position || 0));

                        return (
                            <div key={column.id} className="flex flex-col min-w-[320px] w-[320px] bg-slate-100/50 rounded-2xl border border-slate-200/60 flex-shrink-0">

                                {/* Header de la Colonne */}
                                <div className="px-4 bg-white rounded-t-2xl py-3 flex items-center justify-between border-b border-slate-200/50">
                                    <div className="flex items-center gap-2">
                                        <h3 className="card-title">{column.title}</h3>
                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", column.color)}>
                                            {columnTasks.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleOpenNewTask(column.id)}
                                        className="h-6 w-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Zone Droppable (La liste des tâches) */}
                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn(
                                                "flex-1 p-3 space-y-3 overflow-y-auto min-h-[150px] transition-colors",
                                                snapshot.isDraggingOver ? "bg-slate-100" : ""
                                            )}
                                        >
                                            {columnTasks.map((task, index) => (
                                                <TaskCard key={task.id} task={task} index={index} onClick={() => handleOpenEditTask(task)} />
                                            ))}
                                            {provided.placeholder}

                                            {/* Bouton rapide d'ajout en bas de colonne */}
                                            <button onClick={() => handleOpenNewTask(column.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-all">
                                                <span>+</span> Ajouter
                                            </button>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext >
            <TaskSlideOver
                open={slideOverOpen}
                onOpenChange={setSlideOverOpen}
                task={selectedTask}
                projectId={projectId}
                onSaved={handleTaskSaved}
                initialStatus={targetStatus}
            />
        </>
    );
}

// ----------------------------------------------------
// Sous-composant : La Carte du Ticket
// ----------------------------------------------------
function TaskCard({ task, index, onClick }: { task: any, index: number, onClick: () => void }) {
    const TYPE_STYLES: Record<string, { icon: any, label: string, color: string }> = {
        feature: { icon: AlignLeft,     label: "Feature",  color: "text-blue-600 bg-blue-50" },
        bug:     { icon: Bug,           label: "Bug",      color: "text-red-600 bg-red-50" },
        design:  { icon: LayoutTemplate,label: "Design",   color: "text-purple-600 bg-purple-50" },
        content: { icon: PenTool,       label: "Contenu",  color: "text-emerald-600 bg-emerald-50" },
        setup:   { icon: Settings,      label: "Setup",    color: "text-slate-600 bg-slate-100" },
    };

    const PRIORITY_ICONS: Record<string, any> = {
        low:    { icon: ArrowDown,    color: "text-slate-400" },
        medium: { icon: Equal,        color: "text-slate-500" },
        high:   { icon: ArrowUp,      color: "text-orange-500" },
        urgent: { icon: AlertOctagon, color: "text-red-600" },
    };

    const typeConfig = TYPE_STYLES[task.type || 'feature'];
    const priorityConfig = PRIORITY_ICONS[task.priority || 'medium'];
    const commentCount = task.task_comments?.[0]?.count ?? 0;
    const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), "day") && task.status !== "done";

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    className={cn(
                        "p-4 rounded-xl border bg-white group hover:border-primary/30 transition-all select-none",
                        snapshot.isDragging ? "shadow-xl scale-[1.02] rotate-1 z-50" : "shadow-sm"
                    )}
                >
                    {/* Top row: ticket ID + type tag */}
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            TCK-{task.id.split('-')[0].substring(0, 4)}
                        </span>
                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", typeConfig.color)}>
                            <typeConfig.icon className="w-2.5 h-2.5" />
                            {typeConfig.label}
                        </div>
                    </div>

                    {/* Title — explicitly Inter, bigger */}
                    <p className="font-sans text-[15px] font-semibold text-slate-900 leading-snug mb-1.5">
                        {task.title}
                    </p>

                    {/* Description snippet */}
                    {task.description && (
                        <p className="font-sans text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                            {task.description}
                        </p>
                    )}

                    {/* Due date badge */}
                    {task.due_date && (
                        <div className={cn(
                            "flex items-center gap-1 mb-3 w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            isOverdue
                                ? "bg-red-50 text-red-600"
                                : "bg-slate-100 text-slate-500"
                        )}>
                            <CalendarDays className="w-3 h-3" />
                            {dayjs(task.due_date).locale("fr").format("D MMM")}
                            {isOverdue && " · retard"}
                        </div>
                    )}

                    <div className={cn("flex items-center justify-between pt-3 border-t border-slate-50", task.description || task.due_date ? "" : "mt-3")}>
                        {/* Priorité */}
                        <div className="flex items-center gap-1.5">
                            <priorityConfig.icon className={cn("w-3.5 h-3.5", priorityConfig.color)} />
                            <span className="capitalize text-[10px] font-medium text-slate-400">{task.priority}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {commentCount > 0 && (
                                <div className="flex items-center gap-1 text-slate-400">
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">{commentCount}</span>
                                </div>
                            )}
                            {task.assignee ? (
                                <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-white ring-1 ring-slate-100 text-white"
                                    style={{ backgroundColor: "var(--primary)" }}
                                >
                                    {task.assignee.first_name?.charAt(0)}{task.assignee.last_name?.charAt(0)}
                                </div>
                            ) : (
                                <div className="h-6 w-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors">
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