"use client"

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar"
import { NavigationProgress } from "@/components/navigation-progress"
import { DemoBanner } from "@/components/DemoBanner"
import { cn } from "@/lib/utils";
import { useAgency } from "@/providers/agency-provider";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { agency } = useAgency();

    const primaryColor = agency?.primary_color || "#2563EB";

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            <NavigationProgress />
            <AppSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            <div className={cn(
                "flex-1 flex flex-col overflow-hidden transition-all duration-300",
                isCollapsed ? "md:pl-20" : "md:pl-64"
            )}>
                {/* Mobile top bar */}
                <header className="flex items-center gap-3 h-14 px-4 border-b border-border bg-background md:hidden shrink-0">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="flex items-center justify-center h-9 w-9 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Agency logo + name */}
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold overflow-hidden"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {agency?.logo_url ? (
                                <Image src={agency.logo_url} alt={agency.name ?? "Agence"} width={28} height={28} unoptimized className="w-full h-full object-contain p-0.5" />
                            ) : (
                                agency?.name?.charAt(0)?.toUpperCase() || "A"
                            )}
                        </div>
                        <span className="font-bold text-foreground text-sm truncate">{agency?.name}</span>
                    </div>
                </header>

                <DemoBanner />
                <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    )
}
