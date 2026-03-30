"use client"

import { useAgency } from "@/providers/agency-provider"
import { Sparkles } from "lucide-react"

function getDaysRemaining(endDate: string): number {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getLabel(days: number): string {
    if (days <= 0) return "Votre période de démo expire aujourd'hui"
    if (days === 1) return "Fin de la démo demain"
    return `Fin de la démo dans ${days} jour${days > 1 ? "s" : ""}`
}

export function DemoBanner() {
    const { agency } = useAgency()

    if (!agency?.demo_ends_at) return null

    if (new Date(agency.demo_ends_at) <= new Date()) return null

    const days = getDaysRemaining(agency.demo_ends_at)

    const isUrgent = days <= 3

    return (
        <div className={`shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
            isUrgent
                ? "bg-amber-50 text-amber-700 border-b border-amber-200"
                : "bg-indigo-50 text-indigo-700 border-b border-indigo-100"
        }`}>
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>{getLabel(days)} — accès PRO complet inclus</span>
        </div>
    )
}
