"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface RichTextViewerProps {
    content: string;
    className?: string;
}

/**
 * Renders rich text HTML (from Tiptap) or plain text (legacy content).
 * Plain text is detected by the absence of HTML tags and rendered with whitespace-pre-wrap.
 * Entity references (data-entity-type) are clickable and navigate to the referenced entity.
 */
export function RichTextViewer({ content, className }: RichTextViewerProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        function handleClick(e: MouseEvent) {
            const span = (e.target as HTMLElement).closest("[data-entity-type]");
            if (!span) return;
            const type = span.getAttribute("data-entity-type");
            const id = span.getAttribute("data-id");
            const projectSlug = span.getAttribute("data-project-slug");
            if (!type || !id) return;
            e.preventDefault();
            e.stopPropagation();
            switch (type) {
                case "ticket":
                    if (projectSlug) router.push(`/app/projects/${projectSlug}/board?task=${id}`);
                    else router.push(`/app/projects`);
                    break;
                case "project":
                    router.push(`/app/projects/${id}`);
                    break;
                case "opportunity":
                    router.push(`/app/opportunities/${id}`);
                    break;
                case "quote":
                    router.push(`/app/quotes/${id}`);
                    break;
            }
        }

        el.addEventListener("click", handleClick);
        return () => el.removeEventListener("click", handleClick);
    }, [router]);

    if (!content) return null;

    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    if (!isHtml) {
        return (
            <p className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", className)}>
                {content}
            </p>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "prose prose-sm max-w-none text-sm leading-relaxed break-words",
                // Links
                "[&_a]:text-primary [&_a]:cursor-pointer [&_a]:underline [&_a]:underline-offset-2",
                // People mentions
                "[&_.mention]:inline-flex [&_.mention]:items-center [&_.mention]:bg-primary/10 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:font-medium [&_.mention]:text-[0.85em]",
                // Entity refs — clickable badges
                "[&_.entity-ref]:cursor-pointer [&_.entity-ref]:hover:opacity-80 [&_.entity-ref]:transition-opacity",
                // Lists
                "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                className
            )}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
