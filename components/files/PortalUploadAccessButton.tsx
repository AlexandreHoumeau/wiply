"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAgencyPortalUploadUrl, getPortalUploadUrl } from "@/actions/portal.server";
import { cn } from "@/lib/utils";

type PortalUploadAccessButtonProps = {
    itemId: string;
    portalToken?: string;
    children?: React.ReactNode;
    className?: string;
    variant?: "link" | "button" | "icon";
};

export function PortalUploadAccessButton({
    itemId,
    portalToken,
    children,
    className,
    variant = "button",
}: PortalUploadAccessButtonProps) {
    const [isPending, setIsPending] = useState(false);

    const handleOpen = async () => {
        setIsPending(true);
        const result = portalToken
            ? await getPortalUploadUrl(portalToken, itemId)
            : await getAgencyPortalUploadUrl(itemId);
        setIsPending(false);

        if (!result.success || !result.url) {
            toast.error(result.error ?? "Impossible d'ouvrir le fichier");
            return;
        }

        window.open(result.url, "_blank", "noopener,noreferrer");
    };

    if (variant === "icon") {
        return (
            <Button variant="ghost" size="icon" className={cn("h-7 w-7", className)} onClick={handleOpen} disabled={isPending}>
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </Button>
        );
    }

    if (variant === "link") {
        return (
            <button
                type="button"
                onClick={handleOpen}
                disabled={isPending}
                className={cn("text-sm font-semibold text-slate-700 hover:text-blue-600 truncate block disabled:opacity-60", className)}
            >
                {isPending ? "Ouverture..." : children}
            </button>
        );
    }

    return (
        <Button type="button" onClick={handleOpen} disabled={isPending} className={className} variant="outline">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {children}
        </Button>
    );
}
