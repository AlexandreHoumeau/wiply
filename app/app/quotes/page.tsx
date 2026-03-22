"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FileText, ExternalLink, Trash2, Lock, CheckCircle2, Clock, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAgency } from "@/providers/agency-provider"
import { useQuotes, useDeleteQuote } from "@/hooks/use-quotes"
import { computeQuoteTotals } from "@/lib/validators/quotes"
import { isProPlan } from "@/lib/validators/agency"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  all: "Tous",
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
}

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  draft:    { dot: "bg-zinc-300",     text: "text-zinc-500",    bg: "bg-zinc-50" },
  sent:     { dot: "bg-zinc-500",     text: "text-zinc-600",    bg: "bg-zinc-50" },
  accepted: { dot: "bg-emerald-500",  text: "text-emerald-700", bg: "bg-emerald-50/60" },
  rejected: { dot: "bg-zinc-300",     text: "text-zinc-400",    bg: "bg-zinc-50" },
  expired:  { dot: "bg-zinc-300",     text: "text-zinc-400",    bg: "bg-zinc-50" },
}

const STAT_CARDS = [
  { status: "sent",     label: "Envoyés",   icon: Send },
  { status: "accepted", label: "Acceptés",  icon: CheckCircle2 },
  { status: "draft",    label: "Brouillons",icon: Clock },
  { status: "rejected", label: "Refusés",   icon: XCircle },
]

const TABS = ["all", "draft", "sent", "accepted", "rejected", "expired"]

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export default function QuotesPage() {
  const router = useRouter()
  const { agency } = useAgency()
  const [activeTab, setActiveTab] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const deleteQuote = useDeleteQuote()

  const { data: allQuotes } = useQuotes()
  const { data: quotes, isLoading } = useQuotes(
    activeTab !== "all" ? { status: activeTab } : undefined
  )

  if (!agency || !isProPlan(agency)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Fonctionnalité PRO</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Créez des propositions commerciales professionnelles avec le plan PRO.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/app/settings/billing")} className="rounded-full px-5">
          Passer au plan PRO
        </Button>
      </div>
    )
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const result = await deleteQuote.mutateAsync(deleteTarget)
    setDeleteTarget(null)
    if ("error" in result && result.error) toast.error(result.error)
    else toast.success("Devis supprimé")
  }

  // Compute stats from all quotes
  const statData = STAT_CARDS.map(card => {
    const filtered = (allQuotes ?? []).filter(q => q.status === card.status)
    const total = filtered.reduce((sum, q) => {
      const t = computeQuoteTotals({ discount_type: q.discount_type as any, discount_value: q.discount_value, tax_rate: q.tax_rate, items: (q as any).items ?? [] })
      return sum + t.total
    }, 0)
    return { ...card, count: filtered.length, total }
  })

  const currency = (quotes ?? allQuotes ?? [])[0]?.currency ?? "EUR"

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allQuotes?.length ?? 0} devis au total</p>
        </div>
        <Button
          onClick={() => router.push("/app/quotes/new")}
          className="rounded-full h-9 px-4 gap-1.5 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau devis
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statData.map(({ status, label, icon: Icon, count, total }) => {
          const style = STATUS_STYLES[status]
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={cn(
                "group relative text-left rounded-xl border p-4 transition-all hover:shadow-sm cursor-pointer",
                activeTab === status
                  ? "border-foreground/20 bg-card shadow-sm"
                  : "border-border bg-card hover:border-border/80"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold tabular-nums tracking-tight">{count}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              {total > 0 && (
                <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{formatCurrency(total, currency)}</p>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab filters */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === tab
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {STATUS_LABELS[tab]}
            {tab !== "all" && (allQuotes ?? []).filter(q => q.status === tab).length > 0 && (
              <span className="ml-1.5 text-[10px] font-semibold tabular-nums opacity-60">
                {(allQuotes ?? []).filter(q => q.status === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : !quotes?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Aucun devis {activeTab !== "all" ? `"${STATUS_LABELS[activeTab].toLowerCase()}"` : ""}</p>
            <p className="text-xs text-muted-foreground mt-1">Créez votre premier devis pour commencer</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push("/app/quotes/new")}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Créer un devis
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left border-b border-border">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Devis</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Montant</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote, i) => {
                const style = STATUS_STYLES[quote.status] ?? STATUS_STYLES.draft
                const { total } = computeQuoteTotals({ discount_type: quote.discount_type as any, discount_value: quote.discount_value, tax_rate: quote.tax_rate, items: (quote as any).items ?? [] })
                return (
                  <tr
                    key={quote.id}
                    onClick={() => router.push(`/app/quotes/${quote.id}`)}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-muted/40",
                      i !== 0 && "border-t border-border"
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground">{quote.title}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {(quote.company as any)?.name ?? (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs", style.text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
                        {STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums">
                      {formatCurrency(total, quote.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums">
                      {quote.created_at ? formatDate(quote.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/app/quotes/${quote.id}`)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(quote.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis et toutes ses lignes seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteQuote.isPending}
            >
              {deleteQuote.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
