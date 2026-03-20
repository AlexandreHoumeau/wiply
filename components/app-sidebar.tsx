"use client"

import { useState, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Briefcase, Building2, ChevronsUpDown, FileText, Kanban, LayoutDashboard,
    LogOut, Settings, ShieldCheck, Users, PanelLeftClose, PanelLeftOpen, Layers
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationCenter } from "@/components/NotificationCenter"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { signOut } from "@/actions/auth.actions"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const mainNav = [
    { label: "Tableau de bord", href: "/app", icon: LayoutDashboard },
    { label: "Opportunités", href: "/app/opportunities", icon: Briefcase },
    { label: "Devis", href: "/app/quotes", icon: FileText, proOnly: true },
    { label: "Projets", href: "/app/projects", icon: Kanban },
]

const secondaryNav = [
    { label: "Clients", href: "/app/companies", icon: Building2 },
    { label: "Agence", href: "/app/agency", icon: Users },
    { label: "Espace interne", href: "/app/workspace", icon: Layers },
]

interface AppSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (value: boolean) => void;
}

export function AppSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: AppSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { agency, first_name, last_name, email, role } = useAgency()
    const [mounted, setMounted] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => setMounted(true), [])
    useEffect(() => setIsMobileOpen(false), [pathname, setIsMobileOpen])

    function handleSignOut() {
        startTransition(async () => {
            await signOut()
            router.push("/auth/login")
        })
    }

    const fullName = `${first_name} ${last_name}`
    const initials = `${first_name?.charAt(0) || ""}${last_name?.charAt(0) || ""}`
    const primaryColor = agency?.primary_color || "#2563EB"
    const secondaryColor = agency?.secondary_color || "#6366F1"

    const isLinkActive = (href: string) => {
        if (href === "/app") return pathname === "/app"
        return pathname.startsWith(href)
    }

    if (!mounted) return null

    const sidebarContent = (isMobile: boolean) => (
        <>
            {/* --- AGENCY DISPLAY (Static) --- */}
            <div className="flex h-16 items-center px-4 overflow-hidden shrink-0">
                <div className={cn(
                    "flex w-full items-center",
                    !isMobile && isCollapsed ? "justify-center" : "gap-3 px-2"
                )}>
                    <div className="flex shrink-0 aspect-square size-8 items-center justify-center rounded-xl text-white overflow-hidden" style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}55` }}>
                        {agency?.logo_url ? (
                            <img src={agency.logo_url} alt={agency.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                            <span className="text-xs font-bold">{agency?.name?.charAt(0)?.toUpperCase() || "A"}</span>
                        )}
                    </div>
                    {(isMobile || !isCollapsed) && (
                        <>
                            <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                                <span className="truncate font-bold text-sidebar-foreground">{agency?.name || "Mon Agence"}</span>
                                <span className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: secondaryColor }}>
                                    {role?.replace("agency_", "")}
                                </span>
                            </div>
                            <NotificationCenter primaryColor={primaryColor} />
                        </>
                    )}
                </div>
            </div>

            {/* --- NAVIGATION --- */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-6">

                    <div className="space-y-1">
                        {(!isMobile && !isCollapsed) || isMobile ? (
                            <p className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.2em] mb-3 mt-2">Plateforme</p>
                        ) : <div className="h-4" />}
                        {mainNav.map((item) => (
                            <NavItem key={item.href} item={item} active={isLinkActive(item.href)} isCollapsed={!isMobile && isCollapsed} primaryColor={primaryColor} locked={(item as any).proOnly && (!agency || !isProPlan(agency))} />
                        ))}
                    </div>

                    <div className="space-y-1">
                        {(!isMobile && !isCollapsed) || isMobile ? (
                            <p className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.2em] mb-3">Management</p>
                        ) : <div className="w-8 mx-auto h-px bg-sidebar-border my-4" />}
                        {secondaryNav.map((item) => (
                            <NavItem key={item.href} item={item} active={isLinkActive(item.href)} isCollapsed={!isMobile && isCollapsed} primaryColor={primaryColor} />
                        ))}
                    </div>
                </nav>
            </ScrollArea>

            {/* --- USER FOOTER --- */}
            <div className="p-3 mt-auto border-t border-sidebar-border">
                {(isMobile || !isCollapsed) && (
                    <div className="flex justify-end mb-1 px-1">
                        <ThemeToggle />
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className={cn("h-auto w-full transition-all group hover:bg-sidebar-accent/60 hover:shadow-sm", !isMobile && isCollapsed ? "justify-center p-2" : "justify-start gap-3 p-2")}>
                            <div className="relative shrink-0">
                                <Avatar className="h-9 w-9 rounded-xl border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                                    <AvatarFallback className="rounded-xl text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>{initials}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                            </div>
                            {(isMobile || !isCollapsed) && (
                                <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                                    <span className="truncate font-bold text-sidebar-foreground">{fullName}</span>
                                    <span className="truncate text-[10px] text-sidebar-foreground/50">{email}</span>
                                </div>
                            )}
                            {(isMobile || !isCollapsed) && <ChevronsUpDown className="ml-auto size-4 text-slate-500 shrink-0" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-border mb-2 ml-2" side={(!isMobile && isCollapsed) ? "right" : "top"} align="end" sideOffset={12}>
                        <div className="px-3 py-3 mb-2 bg-muted rounded-xl">
                            <p className="text-xs font-bold text-foreground">{fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                        </div>
                        <DropdownMenuGroup className="space-y-1">
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer py-2.5">
                                <Link href="/app/settings/profile"><Settings className="mr-3 h-4 w-4" /><span className="font-medium">Mon Profil</span></Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer py-2.5">
                                <Link href="/app/settings/billing"><ShieldCheck className="mr-3 h-4 w-4" /><span className="font-medium">Abonnement</span></Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="my-2 bg-slate-100" />
                        <DropdownMenuItem className="rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2.5" disabled={isPending} onClick={handleSignOut}>
                            <LogOut className="mr-3 h-4 w-4" /><span className="font-medium">{isPending ? "Déconnexion..." : "Déconnexion"}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )

    return (
        <TooltipProvider delayDuration={0}>
            {/* ── DESKTOP SIDEBAR ── */}
            <motion.aside initial={false} animate={{ width: isCollapsed ? 80 : 256 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} style={{ background: "var(--sidebar-gradient)" }} className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/40 shadow-[4px_0_24px_rgba(149,125,246,0.08)] md:flex">
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-6 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/60 shadow-sm hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all focus:outline-none">
                    {isCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
                </button>
                {sidebarContent(false)}
            </motion.aside>

            {/* ── MOBILE DRAWER ── */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="w-72 p-0 flex flex-col border-r border-white/40" style={{ background: "var(--sidebar-gradient)" }}>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    {sidebarContent(true)}
                </SheetContent>
            </Sheet>
        </TooltipProvider>
    )
}

function NavItem({ item, active, isCollapsed, primaryColor, locked }: any) {
    const navContent = (
        <Button variant="ghost" className={cn("w-full transition-all duration-200 group relative overflow-hidden h-10", isCollapsed ? "justify-center px-0 w-10 mx-auto" : "justify-start gap-3 px-3", active ? "bg-sidebar-accent/50" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40")} style={active ? { color: primaryColor } : undefined}>
            {active && <motion.div layoutId="sidebarActive" className="absolute left-0 w-1 h-5 rounded-r-full" style={{ backgroundColor: primaryColor }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
            <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", !active && "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70")} style={active ? { color: primaryColor } : undefined} />
            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className={cn("text-sm whitespace-nowrap overflow-hidden flex-1", active ? "font-bold" : "font-medium")}>
                        {item.label}
                    </motion.span>
                )}
            </AnimatePresence>
            {!isCollapsed && locked && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">PRO</span>
            )}
        </Button>
    )

    if (locked) {
        return (
            <div className="block relative opacity-70">
                {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>{navContent}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">
                            {item.label} — PRO uniquement
                        </TooltipContent>
                    </Tooltip>
                ) : navContent}
            </div>
        )
    }

    return (
        <Link href={item.href} className="block relative">
            {isCollapsed ? (
                <Tooltip>
                    <TooltipTrigger asChild>{navContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">{item.label}</TooltipContent>
                </Tooltip>
            ) : navContent}
        </Link>
    )
}