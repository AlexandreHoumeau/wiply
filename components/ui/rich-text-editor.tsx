"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Bold, Italic, Link2 } from "lucide-react";
import type { AgencyMember } from "@/actions/agency.server";

// ─── Mention suggestion list ────────────────────────────────────────────────

interface MentionListProps {
    items: AgencyMember[];
    command: (item: { id: string; label: string }) => void;
}

interface MentionListHandle {
    onKeyDown: (event: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);

    useEffect(() => { setSelected(0); }, [items]);

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
                const item = items[selected];
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
                            i === selected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setSelected(i)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
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

// ─── Main editor ────────────────────────────────────────────────────────────

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    onSubmit?: () => void;
    members?: AgencyMember[];
    placeholder?: string;
    className?: string;
    minHeight?: string;
    autoFocus?: boolean;
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
}: RichTextEditorProps) {
    const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
    const [mentionItems, setMentionItems] = useState<AgencyMember[]>([]);
    const mentionCommandRef = useRef<((item: { id: string; label: string }) => void) | null>(null);
    const mentionListRef = useRef<MentionListHandle>(null);
    const onSubmitRef = useRef(onSubmit);
    useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false, code: false }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer" },
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: "mention",
                },
                renderHTML({ options, node }) {
                    return [
                        "span",
                        {
                            ...options.HTMLAttributes,
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
                        onStart: (props: any) => {
                            const rect = props.clientRect?.();
                            if (rect) setPopupPos({ x: rect.left, y: rect.bottom + 4 });
                            setMentionItems(props.items);
                            mentionCommandRef.current = (item) => props.command(item);
                        },
                        onUpdate: (props: any) => {
                            const rect = props.clientRect?.();
                            if (rect) setPopupPos({ x: rect.left, y: rect.bottom + 4 });
                            setMentionItems(props.items);
                            mentionCommandRef.current = (item) => props.command(item);
                        },
                        onExit: () => {
                            setPopupPos(null);
                            setMentionItems([]);
                            mentionCommandRef.current = null;
                        },
                        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
                            if (event.key === "Escape") {
                                setPopupPos(null);
                                setMentionItems([]);
                                return true;
                            }
                            return mentionListRef.current?.onKeyDown(event) ?? false;
                        },
                    }),
                },
            }),
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
            editor.commands.setContent(content || "", false);
        }
    }, [content, editor]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL du lien", prev ?? "https://");
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkToLink().unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkToLink().setLink({ href: url }).run();
    }, [editor]);

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

            {/* Mention popup */}
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
