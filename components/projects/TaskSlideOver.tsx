"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProject } from "@/providers/project-provider";
import { createTask, updateTaskDetails } from "@/actions/project.server";
import { deleteTask, getTaskComments, addTaskComment, deleteTaskComment, type TaskComment } from "@/actions/task.server";
import { getAgencyMembers, type AgencyMember } from "@/actions/agency.server";
import { getProjectVersions, type ProjectVersion } from "@/actions/version.server";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TaskHeader } from "./TaskHeader";
import { TaskSubTasks } from "./TaskSubTasks";
import { TaskComments } from "./TaskComments";
import { TaskSidebar } from "./TaskSidebar";
import dayjs from "dayjs";

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

    const subTasks = [
        ...allTasks.filter((t) => t.parent_id === task?.id),
        ...localSubTasks,
    ].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

    const parentTask = task?.parent_id ? allTasks.find((t) => t.id === task.parent_id) : null;
    const taskSlug = task?.task_number ? `${taskPrefix}-${task.task_number}` : null;
    const isOverdue = !!(dueDate && dayjs(dueDate).isBefore(dayjs(), "day") && status !== "done");
    const doneSubCount = subTasks.filter((t) => t.status === "done").length;

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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[940px] w-full p-0 flex flex-col bg-background border-l border-border shadow-2xl [&>button:first-of-type]:hidden overflow-hidden">
                <VisuallyHidden><SheetTitle>{title || "Ticket"}</SheetTitle></VisuallyHidden>

                <TaskHeader
                    task={task}
                    taskSlug={taskSlug}
                    taskPrefix={taskPrefix}
                    parentTask={parentTask}
                    status={status}
                    type={type}
                    isOverdue={isOverdue}
                    isLoading={isLoading}
                    onOpenTask={onOpenTask}
                    onDelete={handleDelete}
                    onSave={handleSave}
                    onClose={() => onOpenChange(false)}
                />

                <div className="flex flex-1 overflow-hidden">
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
                            <div className="rounded-lg border border-border/40 bg-muted/50 shadow-sm hover:border-border/60 hover:shadow-md focus-within:border-border/80 focus-within:bg-muted/60 focus-within:shadow-md transition-all px-3 py-2 -mx-3 cursor-text">
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

                        <TaskSubTasks
                            task={task}
                            taskPrefix={taskPrefix}
                            subTasks={subTasks}
                            doneSubCount={doneSubCount}
                            newSubTitle={newSubTitle}
                            isCreatingSubTask={isCreatingSubTask}
                            onNewSubTitleChange={setNewSubTitle}
                            onCreateSubTask={handleCreateSubTask}
                            onOpenTask={onOpenTask}
                        />

                        <TaskComments
                            task={task}
                            comments={comments}
                            commentHtml={commentHtml}
                            commentKey={commentKey}
                            isSubmittingComment={isSubmittingComment}
                            isDeletingComment={isDeletingComment}
                            myUserId={(profile as any)?.id}
                            profile={profile}
                            members={members}
                            onCommentChange={setCommentHtml}
                            onSubmitComment={handleSubmitComment}
                            onDeleteComment={handleDeleteComment}
                        />
                    </div>

                    <TaskSidebar
                        task={task}
                        taskPrefix={taskPrefix}
                        parentTask={parentTask}
                        status={status}
                        priority={priority}
                        type={type}
                        assigneeId={assigneeId}
                        dueDate={dueDate}
                        versionId={versionId}
                        members={members}
                        versions={versions}
                        isOverdue={isOverdue}
                        onOpenTask={onOpenTask}
                        onStatusChange={setStatus}
                        onPriorityChange={setPriority}
                        onTypeChange={setType}
                        onAssigneeChange={setAssigneeId}
                        onDueDateChange={setDueDate}
                        onVersionChange={setVersionId}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
