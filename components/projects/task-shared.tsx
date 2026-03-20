"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SidebarSection({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("px-4 py-4 border-b border-border/30", className)}>
            {children}
        </div>
    );
}

export function SidebarLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn("text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1", className)}>
            {children}
        </p>
    );
}

export function SidebarPropRow({
    icon, label, children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
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
