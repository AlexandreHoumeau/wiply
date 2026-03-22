"use client";

import { useRef, useEffect } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { cn, getInitials } from "@/lib/utils";
import { type TaskComment } from "@/actions/task.server";
import { type AgencyMember } from "@/actions/agency.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);

interface TaskCommentsProps {
    task: any;
    comments: TaskComment[];
    commentHtml: string;
    commentKey: number;
    isSubmittingComment: boolean;
    isDeletingComment: string | null;
    myUserId: string | undefined;
    profile: any;
    members: AgencyMember[];
    onCommentChange: (html: string) => void;
    onSubmitComment: () => void;
    onDeleteComment: (id: string) => void;
}

export function TaskComments({
    task, comments, commentHtml, commentKey, isSubmittingComment,
    isDeletingComment, myUserId, profile, members,
    onCommentChange, onSubmitComment, onDeleteComment,
}: TaskCommentsProps) {
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments.length]);

    if (!task) return null;

    return (
        <div className="px-10 pb-12">
            <div className="border-t border-border/30 pt-6">

                {/* Section header */}
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

                {/* Comment list */}
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
                                        !isOwn && "bg-muted text-muted-foreground"
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
                                                onClick={() => onDeleteComment(comment.id)}
                                                disabled={isDeletingComment === comment.id}
                                                className="opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-muted-foreground/20 transition-all shrink-0"
                                            >
                                                {isDeletingComment === comment.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Trash2 className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-muted/50 rounded-xl rounded-tl-none px-4 py-2.5 text-sm text-foreground leading-relaxed border border-border/30 shadow-sm">
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
                            profile?.first_name ?? "",
                            profile?.last_name ?? "",
                            profile?.email ?? ""
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
                                    onChange={onCommentChange}
                                    onSubmit={onSubmitComment}
                                    members={members}
                                    placeholder="Écrire un commentaire…"
                                    minHeight="36px"
                                    enableEntityRefs
                                />
                            </div>
                            {commentHtml.trim() && commentHtml !== "<p></p>" && (
                                <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/20">
                                    <span className="text-[11px] text-muted-foreground/40">⌘↵ pour envoyer</span>
                                    <Button
                                        size="sm"
                                        onClick={onSubmitComment}
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
    );
}
