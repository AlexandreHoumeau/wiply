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

export function DemoBadge() {
    const { agency } = useAgency()

    if (!agency?.demo_ends_at) return null

    const days = getDaysRemaining(agency.demo_ends_at)
    if (days < 0) return null

    const isUrgent = days <= 3

    return (
        <div className={`flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold w-full ${
            isUrgent
                ? "bg-amber-100/80 text-amber-700"
                : "bg-indigo-100/80 text-indigo-700"
        }`}>
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">{getLabel(days)}</span>
        </div>
    )
}
