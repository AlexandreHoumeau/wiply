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
    Tag, GitBranch, Plus, ArrowUpRight,
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

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
    todo:        { icon: Inbox,        label: "À faire",  color: "text-muted-foreground",  badge: "bg-muted text-muted-foreground" },
    in_progress: { icon: PlayCircle,   label: "En cours", color: "text-blue-500",           badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
    review:      { icon: Clock,        label: "En revue", color: "text-amber-500",          badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" },
    done:        { icon: CheckCircle2, label: "Terminé",  color: "text-emerald-500",        badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
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

    // Sub-task inline create
    const [newSubTitle, setNewSubTitle] = useState("");
    const [isCreatingSubTask, setIsCreatingSubTask] = useState(false);
    const [localSubTasks, setLocalSubTasks] = useState<any[]>([]);

    // Reset form when task changes
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

    // Derive sub-tasks from allTasks
    const subTasks = [
        ...allTasks.filter((t) => t.parent_id === task?.id),
        ...localSubTasks,
    ].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

    // Derive parent task
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
            onSaved(); // refresh background data
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[900px] w-full p-0 flex flex-col bg-card border-l border-border/80 shadow-2xl [&>button:first-of-type]:hidden">

                {/* ── Top bar ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                    <div className="flex items-center gap-3">
                        {taskSlug && (
                            <span className="font-mono text-xs font-bold text-muted-foreground/40 tracking-widest">
                                {taskSlug}
                            </span>
                        )}
                        {/* Type chip */}
                        <span className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border",
                            TYPE_CONFIG[type]?.chip ?? "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                            <TypeIcon className="w-3.5 h-3.5" />
                            {TYPE_CONFIG[type]?.label}
                        </span>
                        {/* Status badge */}
                        <span className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                            STATUS_CONFIG[status]?.badge ?? "bg-muted text-muted-foreground"
                        )}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {STATUS_CONFIG[status]?.label}
                        </span>
                        {isOverdue && (
                            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                                En retard
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {task && (
                            <button
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                                Supprimer
                            </button>
                        )}
                        <Button onClick={handleSave} disabled={isLoading} size="sm" className="h-8 px-5 text-xs font-semibold gap-1.5 shadow-sm">
                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {task ? "Enregistrer" : "Créer le ticket"}
                        </Button>
                        <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── Left: main content ─────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto min-w-0">
                        {/* Title */}
                        <div className="px-8 pt-8 pb-3">
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Titre du ticket..."
                                autoFocus={!task}
                                className="w-full text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none leading-tight"
                            />
                        </div>

                        {/* Description (rich text) */}
                        <div className="px-8 pb-6">
                            <div className="rounded-xl border border-transparent hover:border-border/60 focus-within:border-border focus-within:bg-muted/30 transition-colors px-3 py-2 -mx-3 cursor-text">
                                <RichTextEditor
                                    key={task?.id ?? "new"}
                                    content={description}
                                    onChange={setDescription}
                                    members={members}
                                    placeholder="Contexte, liens utiles, critères d'acceptation…"
                                    minHeight="80px"
                                    className="text-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Sub-tasks */}
                        {task && (
                            <div className="px-8 pb-6">
                                <div className="border-t border-border/50 pt-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                            Sous-tâches
                                        </span>
                                        {subTasks.length > 0 && (
                                            <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                                                {subTasks.filter((t) => t.status === "done").length}/{subTasks.length}
                                            </span>
                                        )}
                                    </div>

                                    {subTasks.length > 0 && (
                                        <div className="space-y-1 mb-3">
                                            {subTasks.map((sub) => {
                                                const SubStatusIcon = STATUS_CONFIG[sub.status]?.icon ?? Inbox;
                                                const subSlug = sub.task_number ? `${taskPrefix}-${sub.task_number}` : null;
                                                return (
                                                    <div key={sub.id} className="flex items-center gap-2 py-1 group/sub">
                                                        <SubStatusIcon className={cn("w-3.5 h-3.5 shrink-0", STATUS_CONFIG[sub.status]?.color)} />
                                                        <button
                                                            onClick={() => onOpenTask?.(sub)}
                                                            className="flex-1 text-left text-sm text-foreground hover:text-primary transition-colors truncate"
                                                        >
                                                            {subSlug && <span className="font-mono text-[10px] text-muted-foreground/50 mr-1.5">{subSlug}</span>}
                                                            {sub.title}
                                                        </button>
                                                        <ArrowUpRight className="w-3 h-3 text-muted-foreground/0 group-hover/sub:text-muted-foreground/40 transition-colors shrink-0" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Inline create sub-task */}
                                    <form onSubmit={handleCreateSubTask} className="flex items-center gap-2">
                                        <Plus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                                        <input
                                            value={newSubTitle}
                                            onChange={(e) => setNewSubTitle(e.target.value)}
                                            placeholder="Ajouter une sous-tâche…"
                                            disabled={isCreatingSubTask}
                                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/30 text-foreground"
                                        />
                                        {newSubTitle.trim() && (
                                            <button
                                                type="submit"
                                                disabled={isCreatingSubTask}
                                                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {isCreatingSubTask ? <Loader2 className="w-3 h-3 animate-spin" /> : "Créer"}
                                            </button>
                                        )}
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Activity / Comments */}
                        {task && (
                            <div className="px-8 pb-10">
                                <div className="border-t border-border/50 pt-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                            Activité
                                        </span>
                                        {comments.length > 0 && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {comments.length} commentaire{comments.length > 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>

                                    {comments.length === 0 && (
                                        <p className="text-sm text-muted-foreground">Aucun commentaire pour l&apos;instant.</p>
                                    )}

                                    <div className="space-y-5">
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
                                                            "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ring-2 ring-background",
                                                            !isOwn && "bg-muted text-muted-foreground"
                                                        )}
                                                        style={isOwn
                                                            ? { backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }
                                                            : undefined
                                                        }
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-foreground">{authorName}</span>
                                                            {isOwn && (
                                                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                    Vous
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-muted-foreground ml-auto">
                                                                {dayjs(comment.created_at).locale("fr").fromNow()}
                                                            </span>
                                                            {isOwn && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={isDeletingComment === comment.id}
                                                                    className="opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 text-muted-foreground/30 transition-all shrink-0"
                                                                >
                                                                    {isDeletingComment === comment.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="bg-muted rounded-xl rounded-tl-sm px-4 py-3 text-sm text-foreground leading-relaxed border border-border/50">
                                                            <RichTextViewer content={comment.content} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={commentsEndRef} />
                                    </div>

                                    {/* Comment composer */}
                                    <div className="flex gap-3 items-start">
                                        <div
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-1 ring-2 ring-background"
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
                                                commentHtml ? "border-border bg-card shadow-sm" : "border-border/50 bg-muted/50"
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
                                                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
                                                        <span className="text-xs text-muted-foreground">⌘↵ pour envoyer</span>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSubmitComment}
                                                            disabled={isSubmittingComment}
                                                            className="h-7 px-3 text-xs gap-1"
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

                    {/* ── Right sidebar: properties ───────────────────────── */}
                    <div className="w-72 shrink-0 border-l border-border/50 bg-muted/30 overflow-y-auto">

                        {/* Parent task link */}
                        {task?.parent_id && (
                            <div className="px-5 py-4 border-b border-border/50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Ticket parent</p>
                                {parentTask ? (
                                    <button
                                        onClick={() => onOpenTask?.(parentTask)}
                                        className="flex items-center gap-1.5 text-sm text-primary hover:underline text-left group"
                                    >
                                        <span className="font-mono text-[10px] text-muted-foreground/60">
                                            {taskPrefix}-{parentTask.task_number}
                                        </span>
                                        <span className="truncate">{parentTask.title}</span>
                                        <ArrowUpRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Ticket parent</span>
                                )}
                            </div>
                        )}

                        {/* Assignee hero block */}
                        <div className="px-5 py-5 border-b border-border/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Assigné à</p>
                            <div className="flex items-center gap-3">
                                {assigneeMember ? (
                                    <>
                                        <div
                                            className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                            style={{ backgroundColor: "var(--brand-secondary,#6366F1)" }}
                                        >
                                            {getInitials(assigneeMember.first_name ?? "", assigneeMember.last_name ?? "", assigneeMember.email ?? "")}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{assigneeName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{assigneeMember.email}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="h-9 w-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                            <UserRound className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Non assigné</span>
                                    </div>
                                )}
                            </div>
                            <Select
                                value={assigneeId ?? "unassigned"}
                                onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}
                            >
                                <SelectTrigger className="mt-3 h-8 text-xs border-border bg-card shadow-none text-muted-foreground focus:ring-0">
                                    <SelectValue placeholder="Changer l'assigné" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl min-w-[200px]">
                                    <SelectItem value="unassigned" className="text-xs text-muted-foreground">Non assigné</SelectItem>
                                    {members.map((m) => {
                                        const name = m.first_name
                                            ? `${m.first_name} ${m.last_name ?? ""}`.trim()
                                            : (m.email ?? m.id);
                                        return (
                                            <SelectItem key={m.id} value={m.id} className="text-xs">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
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

                        {/* Due date */}
                        <div className={cn("px-5 py-4 border-b border-border/50", isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : "")}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Échéance</p>
                            {dueDate ? (
                                <div className={cn("flex items-center gap-2 mb-2", isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                    <CalendarDays className="w-4 h-4 shrink-0" />
                                    <span className="text-sm font-semibold">{dayjs(dueDate).locale("fr").format("dddd D MMMM YYYY")}</span>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground mb-2">Aucune échéance</p>
                            )}
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-8 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 outline-none focus:border-border cursor-pointer"
                            />
                        </div>

                        {/* Properties grid */}
                        <div className="px-5 py-4 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Propriétés</p>

                            {/* Status */}
                            <PropRow label="Statut" icon={<StatusIcon className={cn("w-4 h-4", STATUS_CONFIG[status]?.color)} />}>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-8 border-border bg-card shadow-none text-xs font-medium text-foreground focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                            <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PropRow>

                            {/* Priority */}
                            <PropRow label="Priorité" icon={<PriorityIcon className={cn("w-4 h-4", PRIORITY_CONFIG[priority]?.color)} />}>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-8 border-border bg-card shadow-none text-xs font-medium text-foreground focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                                            <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PropRow>

                            {/* Type */}
                            <PropRow label="Catégorie" icon={<TypeIcon className="w-4 h-4 text-muted-foreground" />}>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="h-8 border-border bg-card shadow-none text-xs font-medium text-foreground focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                                            <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PropRow>

                            {/* Version */}
                            <PropRow label="Version" icon={<Tag className="w-4 h-4 text-muted-foreground" />}>
                                <Select
                                    value={versionId ?? "none"}
                                    onValueChange={(v) => setVersionId(v === "none" ? null : v)}
                                >
                                    <SelectTrigger className="h-8 border-border bg-card shadow-none text-xs font-medium text-foreground focus:ring-0">
                                        <SelectValue placeholder="Aucune version" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none" className="text-xs text-muted-foreground">Aucune version</SelectItem>
                                        {versions.filter((v) => v.status === "open").map((v) => (
                                            <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PropRow>
                        </div>

                        {/* Meta */}
                        {task && (task.created_at || task.creator) && (
                            <div className="px-5 py-4 border-t border-border/50 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Info</p>
                                {task.created_at && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Créé</span>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {dayjs(task.created_at).locale("fr").fromNow()}
                                        </span>
                                    </div>
                                )}
                                {task.creator && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-muted-foreground shrink-0">Par</span>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div
                                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }}
                                            >
                                                {getInitials(task.creator.first_name, task.creator.last_name, task.creator.email)}
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground truncate">
                                                {task.creator.first_name
                                                    ? `${task.creator.first_name} ${task.creator.last_name ?? ""}`.trim()
                                                    : task.creator.email}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function PropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1 pb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                {icon}
                <span className="text-xs font-semibold">{label}</span>
            </div>
            {children}
        </div>
    );
}
