import { cn } from "@/lib/utils";

interface RichTextViewerProps {
    content: string;
    className?: string;
}

/**
 * Renders rich text HTML (from Tiptap) or plain text (legacy content).
 * Plain text is detected by the absence of HTML tags and rendered with whitespace-pre-wrap.
 */
export function RichTextViewer({ content, className }: RichTextViewerProps) {
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
            className={cn(
                "prose prose-sm max-w-none text-sm leading-relaxed break-words",
                // Links
                "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
                // Mentions
                "[&_.mention]:inline-flex [&_.mention]:items-center [&_.mention]:bg-primary/10 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:font-medium [&_.mention]:text-[0.85em]",
                // Lists
                "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                className
            )}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
