"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { createQuote, listOpportunitiesForSelect } from "@/actions/quotes.server"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type OpportunityOption = { id: string; name: string; company_id: string | null; company: { id: string; name: string } | null }

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { agency } = useAgency()
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([])
  const [search, setSearch] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<OpportunityOption | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(searchParams.get("companyId"))
  const [opportunityId, setOpportunityId] = useState<string | null>(searchParams.get("opportunityId"))

  useEffect(() => {
    listOpportunitiesForSelect().then(setOpportunities)
  }, [])

  // Pre-select opportunity from URL param
  useEffect(() => {
    if (opportunityId && opportunities.length > 0) {
      const found = opportunities.find(o => o.id === opportunityId)
      if (found) setSelectedOpp(found)
    }
  }, [opportunityId, opportunities])

  if (!agency || !isProPlan(agency)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Fonctionnalité PRO</h2>
          <p className="text-muted-foreground max-w-md">
            Les devis sont disponibles sur le plan PRO.
          </p>
        </div>
        <Button onClick={() => router.push("/app/settings/billing")}>
          Passer au plan PRO
        </Button>
      </div>
    )
  }

  const filtered = opportunities.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.company?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectOpp = (opp: OpportunityOption) => {
    setSelectedOpp(opp)
    setOpportunityId(opp.id)
    setCompanyId(opp.company_id)
    setDropdownOpen(false)
    setSearch("")
  }

  const handleClearOpp = () => {
    setSelectedOpp(null)
    setOpportunityId(null)
    // Only clear company if it came from the opp selection
    if (!searchParams.get("companyId")) setCompanyId(null)
    setSearch("")
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis")
      return
    }
    setIsSubmitting(true)
    try {
      const result = await createQuote({
        title: title.trim(),
        company_id: companyId ?? null,
        opportunity_id: opportunityId ?? null,
        description: null,
        valid_until: null,
        currency: "EUR",
        discount_type: null,
        discount_value: null,
        tax_rate: null,
        notes: null,
      })
      if ("error" in result && result.error) {
        toast.error(result.error)
      } else if (result.data) {
        router.push(`/app/quotes/${result.data.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nouveau devis</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titre du devis *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Refonte site web Acme Corp"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>

        {/* Opportunity picker */}
        <div className="space-y-2">
          <Label>Opportunité liée <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
          {selectedOpp ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 text-sm">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="flex-1 truncate font-medium">{selectedOpp.name}</span>
              {selectedOpp.company && (
                <span className="text-muted-foreground text-xs truncate">{selectedOpp.company.name}</span>
              )}
              <button
                onClick={handleClearOpp}
                className="text-muted-foreground hover:text-foreground transition-colors text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Sélectionner une opportunité</span>
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 top-10 left-0 right-0 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="h-7 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">Aucun résultat</p>
                    ) : filtered.map(opp => (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => handleSelectOpp(opp)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{opp.name}</p>
                          {opp.company && <p className="text-xs text-muted-foreground truncate">{opp.company.name}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button onClick={handleCreate} disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? "Création..." : "Créer le devis"}
        </Button>
      </div>
    </div>
  )
}
