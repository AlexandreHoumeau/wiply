"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2, AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon, CheckCircle2, Clock,
    Inbox, PlayCircle, Send, Trash2, X, UserRound, CalendarDays,
    Tag, GitBranch, Plus, ArrowUpRight, ChevronRight,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProject } from "@/providers/project-provider";
import { cn, getInitials } from "@/lib/utils";
import { createTask, updateTaskDetails } from "@/actions/project.server";
import { deleteTask, getTaskComments, addTaskComment, deleteTaskComment, type TaskComment } from "@/actions/task.server";
import { getAgencyMembers, type AgencyMember } from "@/actions/agency.server";
import { getProjectVersions, type ProjectVersion } from "@/actions/version.server";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);

interface TaskSlideOverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any | null;
    projectId: string;
    allTasks?: any[];
    onSaved: () => void;
    onOpenTask?: (task: any) => void;
    initialStatus?: string;
    initialDueDate?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; dot: string; chip: string }> = {
    feature: { icon: AlignLeft,      label: "Fonctionnalité", dot: "bg-blue-500",    chip: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
    bug:     { icon: Bug,            label: "Bug",            dot: "bg-red-500",     chip: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40" },
    design:  { icon: LayoutTemplate, label: "Design",         dot: "bg-purple-500",  chip: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
    content: { icon: PenTool,        label: "Contenu",        dot: "bg-emerald-500", chip: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
    setup:   { icon: Settings,       label: "Setup / Infra",  dot: "bg-muted-foreground/40", chip: "bg-muted text-muted-foreground border-border" },
};

const PRIORITY_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
    low:    { icon: ArrowDown,    label: "Basse",   color: "text-muted-foreground",  badge: "bg-muted text-muted-foreground" },
    medium: { icon: Equal,        label: "Moyenne", color: "text-muted-foreground",  badge: "bg-muted text-muted-foreground" },
    high:   { icon: ArrowUp,      label: "Haute",   color: "text-orange-500",        badge: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
    urgent: { icon: AlertOctagon, label: "Urgente", color: "text-red-500",           badge: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" },
};

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; dot: string }> = {
    todo:        { icon: Inbox,        label: "À faire",  color: "text-muted-foreground",  dot: "bg-muted-foreground/30" },
    in_progress: { icon: PlayCircle,   label: "En cours", color: "text-blue-500",           dot: "bg-blue-500" },
    review:      { icon: Clock,        label: "En revue", color: "text-amber-500",          dot: "bg-amber-500" },
    done:        { icon: CheckCircle2, label: "Terminé",  color: "text-emerald-500",        dot: "bg-emerald-500" },
};

export function TaskSlideOver({
    open, onOpenChange, task, projectId, allTasks = [], onSaved, onOpenTask,
    initialStatus, initialDueDate,
}: TaskSlideOverProps) {
    const { profile } = useUserProfile();
    const project = useProject();
    const taskPrefix = (project as any)?.task_prefix ?? "TCK";

    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState(initialStatus || "todo");
    const [priority, setPriority] = useState("medium");
    const [type, setType] = useState("feature");
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState<string>("");
    const [versionId, setVersionId] = useState<string | null>(null);
    const [members, setMembers] = useState<AgencyMember[]>([]);
    const [versions, setVersions] = useState<ProjectVersion[]>([]);

    const [comments, setComments] = useState<TaskComment[]>([]);
    const [commentHtml, setCommentHtml] = useState("");
    const [commentKey, setCommentKey] = useState(0);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const [newSubTitle, setNewSubTitle] = useState("");
    const [isCreatingSubTask, setIsCreatingSubTask] = useState(false);
    const [localSubTasks, setLocalSubTasks] = useState<any[]>([]);

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setStatus(task.status || "todo");
            setPriority(task.priority || "medium");
            setType(task.type || "feature");
            setAssigneeId(task.assignee_id ?? null);
            setDueDate(task.due_date ?? "");
            setVersionId(task.version_id ?? null);
        } else {
            setTitle(""); setDescription(""); setStatus(initialStatus || "todo");
            setPriority("medium"); setType("feature"); setAssigneeId(null);
            setDueDate(initialDueDate ?? ""); setVersionId(null);
        }
        setLocalSubTasks([]);
        setNewSubTitle("");
        setCommentHtml("");
    }, [task?.id, open, initialDueDate, initialStatus]);

    useEffect(() => { getAgencyMembers().then(setMembers); }, []);
    useEffect(() => {
        getProjectVersions(projectId).then((r) => {
            if (r.success) setVersions(r.data);
        });
    }, [projectId]);

    useEffect(() => {
        if (!task?.id || !open) { setComments([]); return; }
        getTaskComments(task.id).then((r) => {
            if (r.success && r.data) setComments(r.data);
        });
    }, [task?.id, open]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments.length]);

    const subTasks = [
        ...allTasks.filter((t) => t.parent_id === task?.id),
        ...localSubTasks,
    ].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

    const parentTask = task?.parent_id ? allTasks.find((t) => t.id === task.parent_id) : null;

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Le titre est obligatoire.");
        if (!profile?.agency_id) return;
        setIsLoading(true);
        const data = {
            title, description, status, priority, type,
            assignee_id: assigneeId, due_date: dueDate || null,
            version_id: versionId, parent_id: task?.parent_id ?? null,
        };
        const result = task
            ? await updateTaskDetails(task.id, data)
            : await createTask(data, profile.agency_id, projectId);
        setIsLoading(false);
        if (result.success) {
            toast.success(task ? "Ticket mis à jour" : "Ticket créé");
            onSaved(); onOpenChange(false);
        } else {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        const result = await deleteTask(task.id);
        setIsLoading(false);
        if (result.success) {
            toast.success("Ticket supprimé");
            onSaved(); onOpenChange(false);
        } else {
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleSubmitComment = async () => {
        if (!commentHtml.trim() || !task?.id) return;
        setIsSubmittingComment(true);
        const result = await addTaskComment(task.id, commentHtml);
        setIsSubmittingComment(false);
        if (result.success && result.data) {
            setComments((prev) => [...prev, result.data!]);
            setCommentHtml("");
            setCommentKey((k) => k + 1);
        } else {
            toast.error("Impossible d'envoyer le commentaire");
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        setIsDeletingComment(commentId);
        const result = await deleteTaskComment(commentId);
        setIsDeletingComment(null);
        if (result.success) setComments((prev) => prev.filter((c) => c.id !== commentId));
        else toast.error("Impossible de supprimer le commentaire");
    };

    const handleCreateSubTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubTitle.trim() || !profile?.agency_id || !task?.id) return;
        setIsCreatingSubTask(true);
        const result = await createTask(
            { title: newSubTitle.trim(), status: "todo", type: "feature", priority: "medium", parent_id: task.id },
            profile.agency_id, projectId
        );
        setIsCreatingSubTask(false);
        if (result.success && result.data) {
            setLocalSubTasks((prev) => [...prev, result.data]);
            setNewSubTitle("");
            onSaved();
        } else {
            toast.error("Impossible de créer la sous-tâche");
        }
    };

    const taskSlug = task?.task_number ? `${taskPrefix}-${task.task_number}` : null;
    const myUserId = (profile as any)?.id;
    const TypeIcon     = TYPE_CONFIG[type]?.icon ?? AlignLeft;
    const StatusIcon   = STATUS_CONFIG[status]?.icon ?? Inbox;
    const PriorityIcon = PRIORITY_CONFIG[priority]?.icon ?? Equal;
    const isOverdue = dueDate && dayjs(dueDate).isBefore(dayjs(), "day") && status !== "done";
    const assigneeMember = members.find((m) => m.id === assigneeId);
    const assigneeName = assigneeMember?.first_name
        ? `${assigneeMember.first_name} ${assigneeMember.last_name ?? ""}`.trim()
        : assigneeMember?.email ?? null;

    const doneSubCount = subTasks.filter((t) => t.status === "done").length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[940px] w-full p-0 flex flex-col bg-background border-l border-border shadow-2xl [&>button:first-of-type]:hidden overflow-hidden">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-5 h-[52px] border-b border-border shrink-0">

                    {/* Left: breadcrumb + task slug */}
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
                            <span className="font-mono text-xs font-bold text-muted-foreground/40 tracking-widest shrink-0">
                                {taskSlug}
                            </span>
                        )}

                        {/* Status dot + label */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[status]?.dot)} />
                            <span className={cn("text-xs font-semibold hidden sm:inline", STATUS_CONFIG[status]?.color)}>
                                {STATUS_CONFIG[status]?.label}
                            </span>
                        </div>

                        {/* Type chip */}
                        <span className={cn(
                            "hidden md:flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border shrink-0",
                            TYPE_CONFIG[type]?.chip ?? "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                            <TypeIcon className="w-3 h-3" />
                            {TYPE_CONFIG[type]?.label}
                        </span>

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
                                onClick={handleDelete}
                                disabled={isLoading}
                                title="Supprimer le ticket"
                                className="p-1.5 rounded-md text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            size="sm"
                            className="h-8 px-4 text-xs font-semibold gap-1.5 ml-1"
                        >
                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {task ? "Enregistrer" : "Créer le ticket"}
                        </Button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── Left: main content ─────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto min-w-0 scroll-smooth">

                        {/* Title */}
                        <div className="px-10 pt-9 pb-3">
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Titre du ticket…"
                                autoFocus={!task}
                                className="w-full text-[26px] font-bold text-foreground placeholder:text-muted-foreground/20 bg-transparent border-none outline-none leading-snug"
                            />
                        </div>

                        {/* Description */}
                        <div className="px-10 pb-8">
                            <div className="rounded-lg border border-transparent hover:border-border/40 focus-within:border-border/60 focus-within:bg-muted/20 transition-all px-3 py-2 -mx-3 cursor-text">
                                <RichTextEditor
                                    key={task?.id ?? "new"}
                                    content={description}
                                    onChange={setDescription}
                                    members={members}
                                    placeholder="Description, contexte, critères d'acceptation…"
                                    minHeight="72px"
                                    className="text-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Sub-tasks */}
                        {task && (
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
                                                <div className="h-1 w-14 bg-muted rounded-full overflow-hidden">
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

                                    {subTasks.length > 0 && (
                                        <div className="space-y-px mb-3">
                                            {subTasks.map((sub) => {
                                                const SubStatusIcon = STATUS_CONFIG[sub.status]?.icon ?? Inbox;
                                                const subSlug = sub.task_number ? `${taskPrefix}-${sub.task_number}` : null;
                                                const isDone = sub.status === "done";
                                                return (
                                                    <div
                                                        key={sub.id}
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/40 group/sub transition-colors"
                                                    >
                                                        <SubStatusIcon className={cn("w-3.5 h-3.5 shrink-0", isDone ? "text-emerald-500" : STATUS_CONFIG[sub.status]?.color)} />
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
                                                                <span className="font-mono text-[10px] text-muted-foreground/30 mr-2">{subSlug}</span>
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
                                    <form onSubmit={handleCreateSubTask} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-border/30 hover:border-border/60 focus-within:border-border/60 transition-colors group/create">
                                        <Plus className="w-3.5 h-3.5 text-muted-foreground/25 group-focus-within/create:text-muted-foreground/50 transition-colors shrink-0" />
                                        <input
                                            value={newSubTitle}
                                            onChange={(e) => setNewSubTitle(e.target.value)}
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
                        )}

                        {/* Activity / Comments */}
                        {task && (
                            <div className="px-10 pb-12">
                                <div className="border-t border-border/30 pt-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                            Activité
                                        </span>
                                        {comments.length > 0 && (
                                            <span className="text-[11px] text-muted-foreground/30 font-medium">
                                                · {comments.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {comments.length === 0 && (
                                            <p className="text-sm text-muted-foreground/40 italic">
                                                Aucun commentaire pour l&apos;instant.
                                            </p>
                                        )}
                                        {comments.map((comment) => {
                                            const initials = getInitials(
                                                comment.author?.first_name ?? "",
                                                comment.author?.last_name ?? "",
                                                comment.author?.email ?? ""
                                            );
                                            const isOwn = comment.user_id === myUserId;
                                            const authorName = comment.author?.first_name
                                                ? `${comment.author.first_name} ${comment.author.last_name ?? ""}`.trim()
                                                : comment.author?.email ?? "Utilisateur";

                                            return (
                                                <div key={comment.id} className="flex gap-3 group/comment">
                                                    <div
                                                        className={cn(
                                                            "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ring-2 ring-background",
                                                            isOwn ? "" : "bg-muted text-muted-foreground"
                                                        )}
                                                        style={isOwn ? { backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" } : undefined}
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-sm font-semibold text-foreground">{authorName}</span>
                                                            {isOwn && (
                                                                <span className="text-[10px] font-medium text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
                                                                    Vous
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-muted-foreground/40 ml-auto">
                                                                {dayjs(comment.created_at).locale("fr").fromNow()}
                                                            </span>
                                                            {isOwn && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={isDeletingComment === comment.id}
                                                                    className="opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-muted-foreground/20 transition-all shrink-0"
                                                                >
                                                                    {isDeletingComment === comment.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="bg-muted/50 rounded-xl rounded-tl-none px-4 py-2.5 text-sm text-foreground leading-relaxed border border-border/30">
                                                            <RichTextViewer content={comment.content} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={commentsEndRef} />
                                    </div>

                                    {/* Composer */}
                                    <div className="flex gap-3 items-start mt-6">
                                        <div
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1 ring-2 ring-background"
                                            style={{ backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }}
                                        >
                                            {getInitials(
                                                (profile as any)?.first_name ?? "",
                                                (profile as any)?.last_name ?? "",
                                                (profile as any)?.email ?? ""
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={cn(
                                                "border rounded-xl transition-all overflow-hidden",
                                                commentHtml ? "border-border bg-card shadow-sm" : "border-border/30 bg-muted/20"
                                            )}>
                                                <div className="px-4 py-3">
                                                    <RichTextEditor
                                                        key={`comment-${task?.id}-${commentKey}`}
                                                        content={commentHtml}
                                                        onChange={setCommentHtml}
                                                        onSubmit={handleSubmitComment}
                                                        members={members}
                                                        placeholder="Écrire un commentaire… (@ pour mentionner)"
                                                        minHeight="36px"
                                                    />
                                                </div>
                                                {commentHtml.trim() && commentHtml !== "<p></p>" && (
                                                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/20">
                                                        <span className="text-[11px] text-muted-foreground/40">⌘↵ pour envoyer</span>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSubmitComment}
                                                            disabled={isSubmittingComment}
                                                            className="h-7 px-3 text-xs gap-1.5"
                                                        >
                                                            {isSubmittingComment
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Send className="w-3 h-3" />}
                                                            Envoyer
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right sidebar ───────────────────────────────────── */}
                    <div className="w-[252px] shrink-0 border-l border-border/40 overflow-y-auto bg-muted/10">

                        {/* Parent task */}
                        {task?.parent_id && parentTask && (
                            <SidebarSection>
                                <SidebarLabel>Ticket parent</SidebarLabel>
                                <button
                                    onClick={() => onOpenTask?.(parentTask)}
                                    className="flex items-center gap-1.5 text-left group w-full mt-1.5 hover:text-primary transition-colors"
                                >
                                    <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                                        {taskPrefix}-{parentTask.task_number}
                                    </span>
                                    <span className="text-xs text-foreground/70 group-hover:text-primary truncate transition-colors">
                                        {parentTask.title}
                                    </span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0 text-muted-foreground/0 group-hover:text-primary/50 transition-colors ml-auto" />
                                </button>
                            </SidebarSection>
                        )}

                        {/* Assignee */}
                        <SidebarSection>
                            <SidebarLabel>Assigné à</SidebarLabel>
                            <div className="mt-2 space-y-2">
                                {assigneeMember ? (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                            style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                        >
                                            {getInitials(assigneeMember.first_name ?? "", assigneeMember.last_name ?? "", assigneeMember.email ?? "")}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate leading-tight">{assigneeName}</p>
                                            <p className="text-[10px] text-muted-foreground/60 truncate">{assigneeMember.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/20 flex items-center justify-center shrink-0">
                                            <UserRound className="w-3.5 h-3.5 text-muted-foreground/30" />
                                        </div>
                                        <span className="text-xs text-muted-foreground/50">Non assigné</span>
                                    </div>
                                )}
                                <Select
                                    value={assigneeId ?? "unassigned"}
                                    onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}
                                >
                                    <SelectTrigger className="h-7 text-xs border-border/40 bg-card/60 shadow-none focus:ring-0 rounded-lg text-muted-foreground">
                                        <SelectValue placeholder="Changer…" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="unassigned" className="text-xs text-muted-foreground">Non assigné</SelectItem>
                                        {members.map((m) => {
                                            const name = m.first_name ? `${m.first_name} ${m.last_name ?? ""}`.trim() : (m.email ?? m.id);
                                            return (
                                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                                            style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                                        >
                                                            {getInitials(m.first_name ?? "", m.last_name ?? "", m.email ?? "")}
                                                        </span>
                                                        {name}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </SidebarSection>

                        {/* Properties */}
                        <SidebarSection>
                            <SidebarLabel>Propriétés</SidebarLabel>
                            <div className="mt-2 space-y-2.5">

                                {/* Status */}
                                <SidebarPropRow
                                    icon={<div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[status]?.dot)} />}
                                    label="Statut"
                                >
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="h-7 text-xs border-border/40 bg-card/60 shadow-none focus:ring-0 rounded-lg font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                                <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </SidebarPropRow>

                                {/* Priority */}
                                <SidebarPropRow
                                    icon={<PriorityIcon className={cn("w-3.5 h-3.5 shrink-0", PRIORITY_CONFIG[priority]?.color)} />}
                                    label="Priorité"
                                >
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger className="h-7 text-xs border-border/40 bg-card/60 shadow-none focus:ring-0 rounded-lg font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                                                <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </SidebarPropRow>

                                {/* Type */}
                                <SidebarPropRow
                                    icon={<TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />}
                                    label="Catégorie"
                                >
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="h-7 text-xs border-border/40 bg-card/60 shadow-none focus:ring-0 rounded-lg font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                                                <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </SidebarPropRow>

                                {/* Version */}
                                <SidebarPropRow
                                    icon={<Tag className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />}
                                    label="Version"
                                >
                                    <Select value={versionId ?? "none"} onValueChange={(v) => setVersionId(v === "none" ? null : v)}>
                                        <SelectTrigger className="h-7 text-xs border-border/40 bg-card/60 shadow-none focus:ring-0 rounded-lg font-medium">
                                            <SelectValue placeholder="Aucune" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="none" className="text-xs text-muted-foreground">Aucune</SelectItem>
                                            {versions.filter((v) => v.status === "open").map((v) => (
                                                <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </SidebarPropRow>
                            </div>
                        </SidebarSection>

                        {/* Due date */}
                        <SidebarSection className={isOverdue ? "bg-red-50/40 dark:bg-red-950/10" : ""}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <CalendarDays className={cn("w-3 h-3", isOverdue ? "text-red-500" : "text-muted-foreground/50")} />
                                <SidebarLabel className={cn("mb-0", isOverdue ? "text-red-500/80" : "")}>
                                    Échéance{isOverdue ? " · En retard" : ""}
                                </SidebarLabel>
                            </div>
                            {dueDate && (
                                <p className={cn("text-xs font-semibold mb-2", isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                    {dayjs(dueDate).locale("fr").format("D MMM YYYY")}
                                </p>
                            )}
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-7 text-xs text-muted-foreground bg-card/60 border border-border/40 rounded-lg px-2.5 outline-none focus:border-border cursor-pointer"
                            />
                        </SidebarSection>

                        {/* Meta */}
                        {task && (task.created_at || task.creator) && (
                            <SidebarSection className="border-b-0">
                                <SidebarLabel>Info</SidebarLabel>
                                <div className="mt-2 space-y-2">
                                    {task.created_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/50">Créé</span>
                                            <span className="text-[11px] font-medium text-muted-foreground/60">
                                                {dayjs(task.created_at).locale("fr").fromNow()}
                                            </span>
                                        </div>
                                    )}
                                    {task.creator && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-muted-foreground/50 shrink-0">Par</span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div
                                                    className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                                                    style={{ backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }}
                                                >
                                                    {getInitials(task.creator.first_name, task.creator.last_name, task.creator.email)}
                                                </div>
                                                <p className="text-[11px] font-medium text-muted-foreground/70 truncate">
                                                    {task.creator.first_name
                                                        ? `${task.creator.first_name} ${task.creator.last_name ?? ""}`.trim()
                                                        : task.creator.email}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SidebarSection>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function SidebarSection({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("px-4 py-4 border-b border-border/30", className)}>
            {children}
        </div>
    );
}

function SidebarLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn("text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1", className)}>
            {children}
        </p>
    );
}

function SidebarPropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 w-[88px] shrink-0">
                {icon}
                <span className="text-[11px] text-muted-foreground/60 font-medium truncate">{label}</span>
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}
