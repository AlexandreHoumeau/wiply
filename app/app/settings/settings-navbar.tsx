'use client'

import { Building2, CreditCard, Sparkles, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion" // Optionnel mais recommandé pour l'animation

const sections = [
    { id: 'profile', label: 'Profil', icon: User, href: '/app/settings/profile' },
    { id: 'agency', label: 'Agence', icon: Building2, href: '/app/settings/agency' },
    { id: 'ai', label: 'Agent IA', icon: Sparkles, href: '/app/settings/ai' },
    { id: 'billing', label: 'Facturation', icon: CreditCard, href: '/app/settings/billing' }
]

export default function SettingsNavbar() {
    const pathname = usePathname()

    return (
        <div className="w-full pb-6 border-b border-border/50 mb-8">
            <nav className="flex p-1 gap-1 bg-muted/80 rounded-xl w-fit border border-border/50 overflow-x-auto no-scrollbar">
                {sections.map((section) => {
                    const Icon = section.icon
                    const isActive = pathname === section.href

                    return (
                        <Link
                            key={section.id}
                            href={section.href}
                            className={cn(
                                "group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                            style={isActive ? { color: 'var(--brand-secondary, #6366F1)' } : undefined}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <Icon
                                className={cn("h-4 w-4 shrink-0 z-10 transition-colors", !isActive && "text-muted-foreground/60 group-hover:text-muted-foreground")}
                                style={isActive ? { color: 'var(--brand-secondary, #6366F1)' } : undefined}
                            />

                            <span className="relative z-10">{section.label}</span>

                            {section.id === 'ai' && (
                                <span
                                    className="relative z-10 flex h-2 w-2 rounded-full animate-pulse hidden md:block"
                                    style={{ backgroundColor: 'var(--brand-secondary, #6366F1)' }}
                                />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}