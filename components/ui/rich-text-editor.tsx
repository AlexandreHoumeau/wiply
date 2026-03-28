"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bold, Italic, Link2, ExternalLink, Trash2 } from "lucide-react";
import type { AgencyMember } from "@/actions/agency.server";
import type { EntityRef } from "@/actions/references.server";
import {
    searchTickets,
    searchOpportunities,
    searchProjects,
    searchQuotes,
} from "@/actions/references.server";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

const ENTITY_COLORS: Record<EntityRef["entityType"], string> = {
    ticket: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    opportunity: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    project: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    quote: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const ENTITY_LABELS: Record<EntityRef["entityType"], string> = {
    ticket: "Ticket",
    opportunity: "Opportunité",
    project: "Projet",
    quote: "Devis",
};

// ─── People mention list ─────────────────────────────────────────────────────

interface MentionListProps {
    items: AgencyMember[];
    command: (item: { id: string; label: string }) => void;
}

interface MentionListHandle {
    onKeyDown: (event: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);
    const activeIndex = selected >= items.length ? 0 : selected;

    useImperativeHandle(ref, () => ({
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key === "ArrowUp") {
                setSelected((s) => (s - 1 + items.length) % items.length);
                return true;
            }
            if (event.key === "ArrowDown") {
                setSelected((s) => (s + 1) % items.length);
                return true;
            }
            if (event.key === "Enter") {
                const item = items[activeIndex];
                if (item) {
                    const label = item.first_name
                        ? `${item.first_name} ${item.last_name ?? ""}`.trim()
                        : item.email ?? item.id;
                    command({ id: item.id, label });
                }
                return true;
            }
            return false;
        },
    }));

    if (items.length === 0) return null;

    return (
        <div className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[180px] overflow-hidden">
            {items.map((item, i) => {
                const label = item.first_name
                    ? `${item.first_name} ${item.last_name ?? ""}`.trim()
                    : item.email ?? item.id;
                return (
                    <button
                        key={item.id}
                        type="button"
                        className={cn(
                            "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                            i === activeIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setSelected(i)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const label = item.first_name
                                ? `${item.first_name} ${item.last_name ?? ""}`.trim()
                                : item.email ?? item.id;
                            command({ id: item.id, label });
                        }}
                    >
                        <span
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: "var(--brand-secondary, #6366F1)" }}
                        >
                            {label[0]?.toUpperCase()}
                        </span>
                        <span className="truncate">{label}</span>
                    </button>
                );
            })}
        </div>
    );
});

// ─── Entity mention list ──────────────────────────────────────────────────────

interface EntityMentionListProps {
    items: EntityRef[];
    command: (item: { id: string; label: string; entityType: string; projectSlug?: string }) => void;
    hint?: string;
}

interface EntityMentionListHandle {
    onKeyDown: (event: KeyboardEvent) => boolean;
}

const EntityMentionList = forwardRef<EntityMentionListHandle, EntityMentionListProps>(
    function EntityMentionList({ items, command, hint }, ref) {
        const [selected, setSelected] = useState(0);
        const activeIndex = selected >= items.length ? 0 : selected;

        useImperativeHandle(ref, () => ({
            onKeyDown: (event: KeyboardEvent) => {
                if (event.key === "ArrowUp") {
                    setSelected((s) => (s - 1 + items.length) % items.length);
                    return true;
                }
                if (event.key === "ArrowDown") {
                    setSelected((s) => (s + 1) % items.length);
                    return true;
                }
                if (event.key === "Enter") {
                    const item = items[activeIndex];
                    if (item) command({ id: item.id, label: item.label, entityType: item.entityType, projectSlug: item.projectSlug });
                    return true;
                }
                return false;
            },
        }));

        if (items.length === 0 && !hint) return null;

        return (
            <div className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[240px] max-w-[320px] overflow-hidden">
                {hint && items.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground/60 italic">{hint}</div>
                )}
                {items.map((item, i) => (
                    <button
                        key={`${item.entityType}-${item.id}`}
                        type="button"
                        className={cn(
                            "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                            i === activeIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setSelected(i)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            command({ id: item.id, label: item.label, entityType: item.entityType, projectSlug: item.projectSlug });
                        }}
                    >
                        <span className={cn(
                            "text-[9px] font-bold rounded px-1 py-0.5 shrink-0 uppercase tracking-wide",
                            ENTITY_COLORS[item.entityType]
                        )}>
                            {ENTITY_LABELS[item.entityType]}
                        </span>
                        <span className="truncate text-xs">{item.label}</span>
                    </button>
                ))}
            </div>
        );
    }
);

// ─── Link dialog ─────────────────────────────────────────────────────────────

interface LinkDialogProps {
    open: boolean;
    initialUrl: string;
    onConfirm: (url: string) => void;
    onRemove: () => void;
    onClose: () => void;
}

function LinkDialog({ open, initialUrl, onConfirm, onRemove, onClose }: LinkDialogProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(inputRef.current?.value.trim() ?? "");
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        {initialUrl ? "Modifier le lien" : "Insérer un lien"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="py-2">
                        <Input
                            key={initialUrl}
                            ref={inputRef}
                            type="url"
                            placeholder="https://exemple.com"
                            defaultValue={initialUrl}
                            className="w-full"
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2">
                        {initialUrl ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={onRemove}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button type="submit" size="sm">
                                {initialUrl ? "Mettre à jour" : "Insérer"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Entity mention Tiptap extensions ────────────────────────────────────────

const EntityMentionSlash = Mention.extend({
    name: "entityMentionSlash",
    addAttributes() {
        return {
            ...this.parent?.(),
            entityType: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-entity-type"),
            },
            projectSlug: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-project-slug"),
            },
        };
    },
    renderHTML({ node }) {
        const colorMap: Record<string, string> = {
            ticket: "bg-blue-500/10 text-blue-700",
            opportunity: "bg-amber-500/10 text-amber-700",
            project: "bg-violet-500/10 text-violet-700",
            quote: "bg-green-500/10 text-green-700",
        };
        return [
            "span",
            {
                class: cn(
                    "entity-ref cursor-pointer inline-flex items-center gap-0.5 rounded px-1 font-medium text-[0.85em]",
                    colorMap[node.attrs.entityType as string] ?? ""
                ),
                "data-type": "entity-slash",
                "data-entity-type": node.attrs.entityType,
                "data-id": node.attrs.id,
                "data-label": node.attrs.label,
                "data-project-slug": node.attrs.projectSlug ?? "",
            },
            node.attrs.label as string,
        ];
    },
    parseHTML() {
        return [{ tag: 'span[data-type="entity-slash"]' }];
    },
});

const EntityMentionHash = Mention.extend({
    name: "entityMentionHash",
    addAttributes() {
        return {
            ...this.parent?.(),
            projectSlug: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-project-slug"),
            },
        };
    },
    renderHTML({ node }) {
        return [
            "span",
            {
                class: "entity-ref cursor-pointer inline-flex items-center gap-0.5 bg-blue-500/10 text-blue-700 rounded px-1 font-medium text-[0.85em]",
                "data-type": "entity-hash",
                "data-entity-type": "ticket",
                "data-id": node.attrs.id,
                "data-label": node.attrs.label,
                "data-project-slug": node.attrs.projectSlug ?? "",
            },
            node.attrs.label as string,
        ];
    },
    parseHTML() {
        return [{ tag: 'span[data-type="entity-hash"]' }];
    },
});

// ─── Navigation helper ────────────────────────────────────────────────────────

function buildEntityUrl(type: string, id: string, projectSlug?: string | null): string | null {
    switch (type) {
        case "ticket": return projectSlug ? `/app/projects/${projectSlug}/board?task=${id}` : `/app/projects`;
        case "project": return `/app/projects/${id}`;
        case "opportunity": return `/app/opportunities/${id}`;
        case "quote": return `/app/quotes/${id}`;
        default: return null;
    }
}

// ─── Main editor ─────────────────────────────────────────────────────────────

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    onSubmit?: () => void;
    members?: AgencyMember[];
    placeholder?: string;
    className?: string;
    minHeight?: string;
    autoFocus?: boolean;
    enableEntityRefs?: boolean;
}

export function RichTextEditor({
    content,
    onChange,
    onSubmit,
    members = [],
    placeholder = "Écrire…",
    className,
    minHeight = "120px",
    autoFocus = false,
    enableEntityRefs = false,
}: RichTextEditorProps) {
    const router = useRouter();

    // ── People mention state ──
    const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
    const [mentionItems, setMentionItems] = useState<AgencyMember[]>([]);
    const mentionCommandRef = useRef<((item: { id: string; label: string }) => void) | null>(null);
    const mentionListRef = useRef<MentionListHandle>(null);

    // ── Entity mention state ──
    const [entityPopupPos, setEntityPopupPos] = useState<{ x: number; y: number } | null>(null);
    const [entityItems, setEntityItems] = useState<EntityRef[]>([]);
    const [entityHint, setEntityHint] = useState<string | undefined>(undefined);
    const entityCommandRef = useRef<((item: { id: string; label: string; entityType: string; projectSlug?: string }) => void) | null>(null);
    const entityListRef = useRef<EntityMentionListHandle>(null);

    const onSubmitRef = useRef(onSubmit);
    useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkInitialUrl, setLinkInitialUrl] = useState("");

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false, code: false }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer" },
            }),
            // @ → people mentions (unchanged)
            Mention.configure({
                HTMLAttributes: { class: "mention" },
                renderHTML({ options, node }) {
                    return [
                        "span",
                        {
                            ...options.HTMLAttributes,
                            "data-type": "mention",
                            "data-id": node.attrs.id,
                            "data-label": node.attrs.label,
                            class: cn(options.HTMLAttributes?.class as string, "inline-flex items-center gap-0.5 bg-primary/10 text-primary rounded px-1 font-medium text-[0.85em]"),
                        },
                        `@${node.attrs.label}`,
                    ];
                },
                suggestion: {
                    items: ({ query }: { query: string }) => {
                        return members.filter((m) => {
                            const label = m.first_name
                                ? `${m.first_name} ${m.last_name ?? ""}`.trim()
                                : m.email ?? "";
                            return label.toLowerCase().includes(query.toLowerCase());
                        });
                    },
                    render: () => ({
                        onStart: (props: SuggestionProps<AgencyMember>) => {
                            const rect = props.clientRect?.();
                            if (rect) setPopupPos({ x: rect.left, y: rect.bottom + 4 });
                            setMentionItems(props.items);
                            mentionCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string }) => void)(item);
                        },
                        onUpdate: (props: SuggestionProps<AgencyMember>) => {
                            const rect = props.clientRect?.();
                            if (rect) setPopupPos({ x: rect.left, y: rect.bottom + 4 });
                            setMentionItems(props.items);
                            mentionCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string }) => void)(item);
                        },
                        onExit: () => {
                            setPopupPos(null);
                            setMentionItems([]);
                            mentionCommandRef.current = null;
                        },
                        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                            if (event.key === "Escape") { setPopupPos(null); setMentionItems([]); return true; }
                            return mentionListRef.current?.onKeyDown(event) ?? false;
                        },
                    }),
                },
            }),
            // / → entity mentions (/o /p /d)
            ...(enableEntityRefs ? [
                EntityMentionSlash.configure({
                    suggestion: {
                        char: "/",
                        items: async ({ query }: { query: string }) => {
                            const first = query[0]?.toLowerCase();
                            const rest = query.slice(1).trimStart();
                            if (first === "o") {
                                setEntityHint(rest.length === 0 ? "Tapez pour chercher une opportunité…" : undefined);
                                return rest.length === 0 ? [] : searchOpportunities(rest);
                            }
                            if (first === "p") {
                                setEntityHint(rest.length === 0 ? "Tapez pour chercher un projet…" : undefined);
                                return rest.length === 0 ? [] : searchProjects(rest);
                            }
                            if (first === "d") {
                                setEntityHint(rest.length === 0 ? "Tapez pour chercher un devis…" : undefined);
                                return rest.length === 0 ? [] : searchQuotes(rest);
                            }
                            setEntityHint("Tapez /o /p /d pour référencer une entité");
                            return [];
                        },
                        render: () => ({
                            onStart: (props: SuggestionProps<EntityRef>) => {
                                const rect = props.clientRect?.();
                                if (rect) setEntityPopupPos({ x: rect.left, y: rect.bottom + 4 });
                                setEntityItems(props.items);
                                entityCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string; entityType: string; projectSlug?: string }) => void)(item);
                            },
                            onUpdate: (props: SuggestionProps<EntityRef>) => {
                                const rect = props.clientRect?.();
                                if (rect) setEntityPopupPos({ x: rect.left, y: rect.bottom + 4 });
                                setEntityItems(props.items);
                                entityCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string; entityType: string; projectSlug?: string }) => void)(item);
                            },
                            onExit: () => {
                                setEntityPopupPos(null);
                                setEntityItems([]);
                                setEntityHint(undefined);
                                entityCommandRef.current = null;
                            },
                            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                                if (event.key === "Escape") {
                                    setEntityPopupPos(null);
                                    setEntityItems([]);
                                    setEntityHint(undefined);
                                    return true;
                                }
                                return entityListRef.current?.onKeyDown(event) ?? false;
                            },
                        }),
                    },
                }),
                // # → ticket mentions
                EntityMentionHash.configure({
                    suggestion: {
                        char: "#",
                        items: async ({ query }: { query: string }) => {
                            if (!query.trim()) {
                                setEntityHint("Tapez pour chercher un ticket…");
                                return [];
                            }
                            setEntityHint(undefined);
                            return searchTickets(query);
                        },
                        render: () => ({
                            onStart: (props: SuggestionProps<EntityRef>) => {
                                const rect = props.clientRect?.();
                                if (rect) setEntityPopupPos({ x: rect.left, y: rect.bottom + 4 });
                                setEntityItems(props.items);
                                entityCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string; entityType: string; projectSlug?: string }) => void)(item);
                            },
                            onUpdate: (props: SuggestionProps<EntityRef>) => {
                                const rect = props.clientRect?.();
                                if (rect) setEntityPopupPos({ x: rect.left, y: rect.bottom + 4 });
                                setEntityItems(props.items);
                                entityCommandRef.current = (item) => (props.command as (attrs: { id: string; label: string; entityType: string; projectSlug?: string }) => void)(item);
                            },
                            onExit: () => {
                                setEntityPopupPos(null);
                                setEntityItems([]);
                                setEntityHint(undefined);
                                entityCommandRef.current = null;
                            },
                            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                                if (event.key === "Escape") {
                                    setEntityPopupPos(null);
                                    setEntityItems([]);
                                    setEntityHint(undefined);
                                    return true;
                                }
                                return entityListRef.current?.onKeyDown(event) ?? false;
                            },
                        }),
                    },
                }),
            ] : []),
        ],
        content: content || "",
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html === "<p></p>" ? "" : html);
        },
        editorProps: {
            attributes: {
                class: "outline-none",
                "data-placeholder": placeholder,
            },
            handleKeyDown: (_view, event) => {
                if (onSubmitRef.current && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    onSubmitRef.current();
                    return true;
                }
                return false;
            },
            // Make entity-ref nodes navigable with click inside the editor
            handleClickOn: (_view, _pos, node, _nodePos, _event) => {
                if (!enableEntityRefs) return false;
                const typeName = node.type.name;
                if (typeName !== "entityMentionSlash" && typeName !== "entityMentionHash") return false;
                const entityType = typeName === "entityMentionHash" ? "ticket" : (node.attrs.entityType as string);
                const url = buildEntityUrl(entityType, node.attrs.id as string, node.attrs.projectSlug as string | null);
                if (url) router.push(url);
                return true;
            },
        },
        autofocus: autoFocus,
        immediatelyRender: false,
    });

    // Sync content when task changes (but not on every keystroke)
    const prevContentRef = useRef(content);
    useEffect(() => {
        if (!editor) return;
        if (prevContentRef.current === content) return;
        prevContentRef.current = content;
        if (!editor.isFocused) {
            editor.commands.setContent(content || "");
        }
    }, [content, editor]);

    const setLink = () => {
        if (!editor) return;
        const prev = editor.getAttributes("link").href as string | undefined;
        setLinkInitialUrl(prev ?? "");
        setLinkDialogOpen(true);
    };

    const handleLinkConfirm = (url: string) => {
        if (!editor) return;
        setLinkDialogOpen(false);
        if (!url) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url }).run();
    };

    const handleLinkRemove = () => {
        if (!editor) return;
        setLinkDialogOpen(false);
        editor.chain().focus().unsetLink().run();
    };

    if (!editor) return null;

    return (
        <div className={cn("relative", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 mb-1.5">
                <ToolbarBtn
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Gras (⌘B)"
                >
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italique (⌘I)"
                >
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                    active={editor.isActive("link")}
                    onClick={setLink}
                    title="Lien"
                >
                    <Link2 className="w-3.5 h-3.5" />
                </ToolbarBtn>
            </div>

            {/* Editor */}
            <div
                className="relative cursor-text"
                style={{ minHeight }}
                onClick={() => editor.commands.focus()}
            >
                <EditorContent
                    editor={editor}
                    className={cn(
                        "prose prose-sm max-w-none text-sm text-foreground leading-relaxed",
                        "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:cursor-text",
                        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
                        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/40",
                        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
                        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
                        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
                        "[&_a]:text-primary [&_a]:underline",
                    )}
                />
            </div>

            {/* Entity ref hint bar */}
            {enableEntityRefs && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/40 select-none">
                        <span className="font-mono bg-muted/40 rounded px-0.5">#</span> ticket
                        <span className="mx-1.5 opacity-50">·</span>
                        <span className="font-mono bg-muted/40 rounded px-0.5">/o</span> opportunité
                        <span className="mx-1.5 opacity-50">·</span>
                        <span className="font-mono bg-muted/40 rounded px-0.5">/p</span> projet
                        <span className="mx-1.5 opacity-50">·</span>
                        <span className="font-mono bg-muted/40 rounded px-0.5">/d</span> devis
                        <span className="mx-1.5 opacity-50">·</span>
                        <span className="font-mono bg-muted/40 rounded px-0.5">@</span> membre
                    </span>
                </div>
            )}

            {/* People mention popup */}
            {popupPos && mentionItems.length > 0 && typeof document !== "undefined" &&
                createPortal(
                    <div
                        style={{ position: "fixed", left: popupPos.x, top: popupPos.y, zIndex: 9999 }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <MentionList
                            ref={mentionListRef}
                            items={mentionItems}
                            command={(item) => mentionCommandRef.current?.(item)}
                        />
                    </div>,
                    document.body
                )
            }

            {/* Entity mention popup */}
            {entityPopupPos && (entityItems.length > 0 || !!entityHint) && typeof document !== "undefined" &&
                createPortal(
                    <div
                        style={{ position: "fixed", left: entityPopupPos.x, top: entityPopupPos.y, zIndex: 9999 }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <EntityMentionList
                            ref={entityListRef}
                            items={entityItems}
                            hint={entityHint}
                            command={(item) => entityCommandRef.current?.(item)}
                        />
                    </div>,
                    document.body
                )
            }

            {/* Link dialog */}
            <LinkDialog
                open={linkDialogOpen}
                initialUrl={linkInitialUrl}
                onConfirm={handleLinkConfirm}
                onRemove={handleLinkRemove}
                onClose={() => setLinkDialogOpen(false)}
            />
        </div>
    );
}

function ToolbarBtn({
    children,
    active,
    onClick,
    title,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    title?: string;
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            title={title}
            className={cn(
                "p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
                active && "bg-muted text-foreground"
            )}
        >
            {children}
        </button>
    );
}
