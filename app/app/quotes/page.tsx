"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FileText, ExternalLink, Trash2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAgency } from "@/providers/agency-provider"
import { useQuotes, useDeleteQuote } from "@/hooks/use-quotes"
import { computeQuoteTotals } from "@/lib/validators/quotes"
import { toast } from "sonner"

const STATUS_LABELS: Record<string, string> = {
  all: "Tous",
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
}

const TABS = ["all", "draft", "sent", "accepted", "rejected", "expired"]

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export default function QuotesPage() {
  const router = useRouter()
  const { agency } = useAgency()
  const [activeTab, setActiveTab] = useState("all")
  const deleteQuote = useDeleteQuote()

  const { data: quotes, isLoading } = useQuotes(
    activeTab !== "all" ? { status: activeTab } : undefined
  )

  if (agency?.plan !== "PRO") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Fonctionnalité PRO</h2>
          <p className="text-muted-foreground max-w-md">
            Les devis sont disponibles sur le plan PRO. Passez au plan PRO pour créer des propositions commerciales professionnelles.
          </p>
        </div>
        <Button onClick={() => router.push("/app/settings/billing")}>
          Passer au plan PRO
        </Button>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce devis ?")) return
    const result = await deleteQuote.mutateAsync(id)
    if ("error" in result && result.error) {
      toast.error(result.error)
    } else {
      toast.success("Devis supprimé")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Devis</h1>
        <Button onClick={() => router.push("/app/quotes/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau devis
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABELS[tab]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : !quotes || quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">Aucun devis trouvé</p>
          <Button variant="outline" onClick={() => router.push("/app/quotes/new")}>
            Créer un premier devis
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Titre</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Créé le</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((quote) => {
                  const totals = computeQuoteTotals({
                    discount_type: quote.discount_type as any,
                    discount_value: quote.discount_value,
                    tax_rate: quote.tax_rate,
                    items: [],
                  })
                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/app/quotes/${quote.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{quote.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(quote.company as any)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status]}`}>
                          {STATUS_LABELS[quote.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {formatCurrency(totals.total, quote.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {quote.created_at ? formatDate(quote.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/app/quotes/${quote.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(quote.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
