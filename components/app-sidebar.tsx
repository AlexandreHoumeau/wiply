"use client"

import { useEffect, useSyncExternalStore, useTransition } from "react"
import { useUpgradeDialog } from '@/providers/UpgradeDialogProvider'
import { createCheckoutSession } from '@/actions/billing.server'
import { toast } from 'sonner'
import { motion } from "framer-motion"
import {
    Briefcase, Building2, ChevronsUpDown, FileText, Kanban, LayoutDashboard,
    Lock, LogOut, Settings, ShieldCheck, Users, PanelLeftClose, PanelLeftOpen, Layers, Zap
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

type NavConfigItem = {
    label: string
    href: string
    icon: React.ElementType
    proOnly?: boolean
}

const mainNav: NavConfigItem[] = [
    { label: "Tableau de bord", href: "/app", icon: LayoutDashboard },
    { label: "Opportunités", href: "/app/opportunities", icon: Briefcase },
    { label: "Devis", href: "/app/quotes", icon: FileText, proOnly: true },
    { label: "Projets", href: "/app/projects", icon: Kanban },
]

const secondaryNav: NavConfigItem[] = [
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
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    )
    const pathname = usePathname()
    const router = useRouter()
    const { agency, first_name, last_name, email, role } = useAgency()
    const { openUpgradeDialog } = useUpgradeDialog()
    const [isPending, startTransition] = useTransition()
    const [isCheckoutPending, startCheckout] = useTransition()

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
                            <NavItem
                                key={item.href}
                                item={item}
                                active={isLinkActive(item.href)}
                                isCollapsed={!isMobile && isCollapsed}
                                primaryColor={primaryColor}
                                locked={!!item.proOnly && (!agency || !isProPlan(agency))}
                                agencyId={agency?.id ?? ''}
                                openUpgradeDialog={openUpgradeDialog}
                            />
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

            {/* --- FREE UPGRADE BLOC --- */}
            {agency && !isProPlan(agency) && (
                <div className="px-3 pb-3">
                    {(isMobile || !isCollapsed) ? (
                        // --- EXPANDED STATE ---
                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden group transition-colors hover:bg-indigo-500/10">
                            {/* Subtle hover glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-widest mb-0.5">
                                        Plan actuel
                                    </p>
                                    <p className="text-sm font-black text-foreground">
                                        Gratuit
                                    </p>
                                </div>
                                {/* Floating Icon Badge */}
                                <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center shrink-0">
                                    <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    startCheckout(async () => {
                                        const result = await createCheckoutSession(agency.id)
                                        if ('url' in result) window.location.href = result.url
                                        else toast.error(result.error)
                                    })
                                }}
                                disabled={isCheckoutPending}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200",
                                    "hover:from-indigo-600 hover:to-violet-700 hover:shadow-md hover:shadow-indigo-500/25",
                                    "active:scale-[0.98]",
                                    "disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                                )}
                            >
                                {isCheckoutPending ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Redirection...
                                    </>
                                ) : (
                                    <>
                                        Débloquer Pro <span className="text-white/70 font-normal ml-0.5">— 39€/m</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        // --- COLLAPSED STATE ---
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        startCheckout(async () => {
                                            const result = await createCheckoutSession(agency.id)
                                            if ('url' in result) window.location.href = result.url
                                            else toast.error(result.error)
                                        })
                                    }}
                                    disabled={isCheckoutPending}
                                    className={cn(
                                        "w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all duration-200",
                                        "hover:bg-indigo-500/20 hover:shadow-sm",
                                        "active:scale-95",
                                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                    )}
                                >
                                    {isCheckoutPending ? (
                                        <div className="w-4 h-4 border-2 border-indigo-600/30 dark:border-indigo-400/30 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                                    ) : (
                                        <Zap className="w-4.5 h-4.5 fill-current" />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={14} className="font-semibold rounded-lg bg-foreground text-background shadow-xl">
                                Passer au PRO
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )}

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
                                <Link href="/app/agency/billing"><ShieldCheck className="mr-3 h-4 w-4" /><span className="font-medium">Abonnement</span></Link>
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

function NavItem({ item, active, isCollapsed, primaryColor, locked, agencyId, openUpgradeDialog }: {
    item: NavConfigItem
    active: boolean
    isCollapsed: boolean
    primaryColor: string
    locked?: boolean
    agencyId?: string
    openUpgradeDialog?: (reason: string, agencyId: string) => void
}) {
    function handleLockedClick() {
        if (openUpgradeDialog && agencyId) {
            openUpgradeDialog(
                `Cette fonctionnalité est réservée au plan PRO. Passez au PRO pour y accéder.`,
                agencyId
            )
        }
    }

    function renderNavContent(onClick?: () => void) {
        return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className={cn(
                "w-full transition-all duration-200 group relative overflow-hidden h-10 flex items-center",
                isCollapsed ? "justify-center px-0 w-10 mx-auto" : "justify-start gap-3 px-3",
                locked
                    ? "bg-amber-50/60 border border-amber-200/60 text-amber-800/70 hover:bg-amber-100/60 opacity-80"
                    : active
                        ? "bg-sidebar-accent/50"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            )}
            style={!locked && active ? { color: primaryColor } : undefined}
        >
            {/* Active Indicator Line */}
            {active && !locked && (
                <motion.div
                    layoutId="sidebarActive"
                    className="absolute left-0 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: primaryColor }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}

            {/* Icon */}
            <item.icon
                className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    locked
                        ? "text-amber-600/50"
                        : !active && "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )}
                style={!locked && active ? { color: primaryColor } : undefined}
            />

            {/* Label */}
            {!isCollapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                        "text-sm whitespace-nowrap overflow-hidden flex-1 text-left",
                        active && !locked ? "font-bold" : "font-medium"
                    )}
                >
                    {item.label}
                </motion.span>
            )}

            {/* Pro Badge or Lock icon */}
            {locked && !isCollapsed && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                    PRO
                </span>
            )}
            {locked && isCollapsed && (
                <Lock className="absolute bottom-1 right-1 w-2.5 h-2.5 text-amber-600/60" />
            )}
        </Button>
        )
    }

    if (locked) {
        return (
            <div className="block relative">
                {isCollapsed ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {renderNavContent(handleLockedClick)}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">
                            {item.label} — PRO uniquement
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    renderNavContent(handleLockedClick)
                )}
            </div>
        )
    }

    return (
        <Link href={item.href} className="block relative">
            {isCollapsed ? (
                <Tooltip>
                    <TooltipTrigger asChild>{renderNavContent()}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">{item.label}</TooltipContent>
                </Tooltip>
            ) : renderNavContent()}
        </Link>
    )
}
