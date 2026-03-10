"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2, AlignLeft, Bug, LayoutTemplate, PenTool, Settings,
    ArrowUp, ArrowDown, Equal, AlertOctagon, CheckCircle2, Clock,
    Inbox, PlayCircle, Send, Trash2, X, UserRound, CalendarDays,
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, getInitials } from "@/lib/utils";
import { createTask, updateTaskDetails } from "@/actions/project.server";
import { deleteTask, getTaskComments, addTaskComment, deleteTaskComment, type TaskComment } from "@/actions/task.server";
import { getAgencyMembers, type AgencyMember } from "@/actions/agency.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);

interface TaskSlideOverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any | null;
    projectId: string;
    onSaved: () => void;
    initialStatus?: string;
    initialDueDate?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; dot: string; chip: string }> = {
    feature: { icon: AlignLeft,      label: "Fonctionnalité", dot: "bg-blue-500",    chip: "bg-blue-50 text-blue-700 border-blue-200" },
    bug:     { icon: Bug,            label: "Bug",            dot: "bg-red-500",     chip: "bg-red-50 text-red-700 border-red-200" },
    design:  { icon: LayoutTemplate, label: "Design",         dot: "bg-purple-500",  chip: "bg-purple-50 text-purple-700 border-purple-200" },
    content: { icon: PenTool,        label: "Contenu",        dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    setup:   { icon: Settings,       label: "Setup / Infra",  dot: "bg-slate-400",   chip: "bg-slate-100 text-slate-600 border-slate-200" },
};

const PRIORITY_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
    low:    { icon: ArrowDown,    label: "Basse",   color: "text-slate-400",   badge: "bg-slate-100 text-slate-500" },
    medium: { icon: Equal,        label: "Moyenne", color: "text-slate-500",   badge: "bg-slate-100 text-slate-600" },
    high:   { icon: ArrowUp,      label: "Haute",   color: "text-orange-500",  badge: "bg-orange-50 text-orange-600" },
    urgent: { icon: AlertOctagon, label: "Urgente", color: "text-red-500",     badge: "bg-red-50 text-red-600" },
};

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
    todo:        { icon: Inbox,        label: "À faire",  color: "text-slate-400",   badge: "bg-slate-100 text-slate-600" },
    in_progress: { icon: PlayCircle,   label: "En cours", color: "text-blue-500",    badge: "bg-blue-50 text-blue-700" },
    review:      { icon: Clock,        label: "En revue", color: "text-amber-500",   badge: "bg-amber-50 text-amber-700" },
    done:        { icon: CheckCircle2, label: "Terminé",  color: "text-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
};

export function TaskSlideOver({
    open, onOpenChange, task, projectId, onSaved, initialStatus, initialDueDate,
}: TaskSlideOverProps) {
    const { profile } = useUserProfile();
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState(initialStatus || "todo");
    const [priority, setPriority] = useState("medium");
    const [type, setType] = useState("feature");
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState<string>("");
    const [members, setMembers] = useState<AgencyMember[]>([]);

    const [comments, setComments] = useState<TaskComment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setStatus(task.status || "todo");
            setPriority(task.priority || "medium");
            setType(task.type || "feature");
            setAssigneeId(task.assignee_id ?? null);
            setDueDate(task.due_date ?? "");
        } else {
            setTitle(""); setDescription(""); setStatus(initialStatus || "todo");
            setPriority("medium"); setType("feature"); setAssigneeId(null); setDueDate(initialDueDate ?? "");
        }
    }, [task, open, initialDueDate]);

    useEffect(() => { getAgencyMembers().then(setMembers); }, []);

    useEffect(() => {
        if (!task?.id || !open) { setComments([]); return; }
        getTaskComments(task.id).then((r) => {
            if (r.success && r.data) setComments(r.data);
        });
    }, [task?.id, open]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments.length]);

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Le titre est obligatoire.");
        if (!profile?.agency_id) return;
        setIsLoading(true);
        const data = { title, description, status, priority, type, assignee_id: assigneeId, due_date: dueDate || null };
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
        if (!commentText.trim() || !task?.id) return;
        setIsSubmittingComment(true);
        const result = await addTaskComment(task.id, commentText);
        setIsSubmittingComment(false);
        if (result.success && result.data) {
            setComments((prev) => [...prev, result.data!]);
            setCommentText("");
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
            <SheetContent className="sm:max-w-[900px] w-full p-0 flex flex-col bg-white border-l border-slate-200/80 shadow-2xl [&>button:first-of-type]:hidden">

                {/* ── Top bar ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        {task && (
                            <span className="font-mono text-xs font-bold text-slate-300 tracking-widest">
                                TCK-{task.id.split("-")[0].substring(0, 4).toUpperCase()}
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
                            STATUS_CONFIG[status]?.badge ?? "bg-slate-100 text-slate-600"
                        )}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {STATUS_CONFIG[status]?.label}
                        </span>
                        {/* Overdue badge */}
                        {isOverdue && (
                            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                En retard
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {task && (
                            <button
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
                            >
                                Supprimer
                            </button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            size="sm"
                            className="h-8 px-5 text-xs font-semibold gap-1.5 shadow-sm"
                        >
                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {task ? "Enregistrer" : "Créer le ticket"}
                        </Button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
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
                                className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent border-none outline-none leading-tight"
                            />
                        </div>

                        {/* Description */}
                        <div className="px-8 pb-6">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Contexte, liens utiles, critères d'acceptation…"
                                className="min-h-[180px] text-sm leading-relaxed text-slate-600 placeholder:text-slate-300 bg-transparent border-none shadow-none focus-visible:ring-0 resize-none p-0"
                            />
                        </div>

                        {/* Activity */}
                        {task && (
                            <div className="px-8 pb-10">
                                <div className="border-t border-slate-100 pt-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                            Activité
                                        </span>
                                        {comments.length > 0 && (
                                            <span className="text-[11px] text-slate-400">
                                                {comments.length} commentaire{comments.length > 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>

                                    {comments.length === 0 && (
                                        <p className="text-sm text-slate-400">Aucun commentaire pour l&apos;instant.</p>
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
                                                        className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ring-2 ring-white"
                                                        style={isOwn
                                                            ? { backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }
                                                            : { backgroundColor: "#e2e8f0", color: "#64748b" }
                                                        }
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-800">{authorName}</span>
                                                            {isOwn && (
                                                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    Vous
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-slate-400 ml-auto">
                                                                {dayjs(comment.created_at).locale("fr").fromNow()}
                                                            </span>
                                                            {isOwn && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={isDeletingComment === comment.id}
                                                                    className="opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all shrink-0"
                                                                >
                                                                    {isDeletingComment === comment.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words border border-slate-100/80">
                                                            {comment.content}
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
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-1 ring-2 ring-white"
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
                                                commentText ? "border-slate-300 bg-white shadow-sm" : "border-slate-200 bg-slate-50"
                                            )}>
                                                <textarea
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                                            e.preventDefault();
                                                            handleSubmitComment();
                                                        }
                                                    }}
                                                    placeholder="Écrire un commentaire…"
                                                    rows={commentText ? 3 : 1}
                                                    className="w-full bg-transparent px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none"
                                                />
                                                {commentText.trim() && (
                                                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
                                                        <span className="text-xs text-slate-400">⌘↵ pour envoyer</span>
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
                    <div className="w-72 shrink-0 border-l border-slate-100 bg-slate-50/40 overflow-y-auto">

                        {/* Assignee hero block */}
                        <div className="px-5 py-5 border-b border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assigné à</p>
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
                                            <p className="text-sm font-semibold text-slate-800 truncate">{assigneeName}</p>
                                            <p className="text-xs text-slate-400 truncate">{assigneeMember.email}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <div className="h-9 w-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                                            <UserRound className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Non assigné</span>
                                    </div>
                                )}
                            </div>
                            {/* Assignee selector */}
                            <Select
                                value={assigneeId ?? "unassigned"}
                                onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}
                            >
                                <SelectTrigger className="mt-3 h-8 text-xs border-slate-200 bg-white shadow-none text-slate-600 focus:ring-0">
                                    <SelectValue placeholder="Changer l'assigné" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl min-w-[200px]">
                                    <SelectItem value="unassigned" className="text-xs text-slate-400">
                                        Non assigné
                                    </SelectItem>
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

                        {/* Due date hero block */}
                        <div className={cn(
                            "px-5 py-4 border-b border-slate-100",
                            isOverdue ? "bg-red-50/50" : ""
                        )}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Échéance</p>
                            {dueDate ? (
                                <div className={cn(
                                    "flex items-center gap-2 mb-2",
                                    isOverdue ? "text-red-600" : "text-slate-700"
                                )}>
                                    <CalendarDays className="w-4 h-4 shrink-0" />
                                    <span className="text-sm font-semibold">
                                        {dayjs(dueDate).locale("fr").format("dddd D MMMM YYYY")}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 mb-2">Aucune échéance</p>
                            )}
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-8 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:border-slate-400 cursor-pointer"
                            />
                        </div>

                        {/* Properties grid */}
                        <div className="px-5 py-4 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Propriétés</p>

                            {/* Status */}
                            <PropRow label="Statut" icon={<StatusIcon className={cn("w-4 h-4", STATUS_CONFIG[status]?.color)} />}>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-8 border-slate-200 bg-white shadow-none text-xs font-medium text-slate-700 focus:ring-0">
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
                                    <SelectTrigger className="h-8 border-slate-200 bg-white shadow-none text-xs font-medium text-slate-700 focus:ring-0">
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
                            <PropRow label="Catégorie" icon={<TypeIcon className="w-4 h-4 text-slate-400" />}>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="h-8 border-slate-200 bg-white shadow-none text-xs font-medium text-slate-700 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                                            <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PropRow>
                        </div>

                        {/* Meta */}
                        {task && (task.created_at || task.creator) && (
                            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Info</p>
                                {task.created_at && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Créé</span>
                                        <span className="text-xs font-medium text-slate-600">
                                            {dayjs(task.created_at).locale("fr").fromNow()}
                                        </span>
                                    </div>
                                )}
                                {task.creator && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-400 shrink-0">Par</span>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div
                                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                                style={{ backgroundColor: "var(--brand-secondary,#6366F1)", color: "#fff" }}
                                            >
                                                {getInitials(task.creator.first_name, task.creator.last_name, task.creator.email)}
                                            </div>
                                            <p className="text-xs font-medium text-slate-600 truncate">
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
            <div className="flex items-center gap-1.5 text-slate-500">
                {icon}
                <span className="text-xs font-semibold">{label}</span>
            </div>
            {children}
        </div>
    );
}
