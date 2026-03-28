"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, ChevronsUpDown, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { createQuote, listOpportunitiesForSelect, getOpportunityForSelect } from "@/actions/quotes.server"
import { toast } from "sonner"

type OpportunityOption = { id: string; name: string; company_id: string | null; company: { id: string; name: string } | null }

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { agency } = useAgency()
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([])
  const [search, setSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<OpportunityOption | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(searchParams.get("companyId"))
  const [opportunityId, setOpportunityId] = useState<string | null>(searchParams.get("opportunityId"))
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-select opportunity from URL param
  useEffect(() => {
    const id = searchParams.get("opportunityId")
    if (id) {
      getOpportunityForSelect(id).then(opp => {
        if (opp) setSelectedOpp(opp)
      })
    }
  }, [searchParams])

  // Fetch on dropdown open (initial load)
  useEffect(() => {
    if (dropdownOpen) {
      setIsSearching(true)
      listOpportunitiesForSelect(search).then(data => {
        setOpportunities(data)
        setIsSearching(false)
      })
    }
  }, [dropdownOpen, search])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setIsSearching(true)
      listOpportunitiesForSelect(value).then(data => {
        setOpportunities(data)
        setIsSearching(false)
      })
    }, 300)
  }, [])

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
        <Button onClick={() => router.push("/app/agency/billing")}>
          Passer au plan PRO
        </Button>
      </div>
    )
  }

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
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <button
        onClick={() => router.back()}
        className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border/50 bg-background group-hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Retour
      </button>

      <div className="bg-card border border-border/60 shadow-sm rounded-3xl p-8 space-y-8 relative">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-[var(--brand-primary)]/40 to-[var(--brand-primary)]/5" />

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau devis</h1>
          <p className="text-sm text-muted-foreground mt-1">Saisissez les informations de base pour commencer.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="title" className="text-sm font-semibold">Titre du devis <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Refonte site web Acme Corp"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-12 px-4 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-[var(--brand-primary)]/20 focus-visible:border-[var(--brand-primary)] transition-all"
              autoFocus
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-semibold">Opportunité liée <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            {selectedOpp ? (
              <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-border/60 bg-muted/20 text-sm">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <span className="flex-1 truncate font-medium text-foreground">{selectedOpp.name}</span>
                {selectedOpp.company && (
                  <span className="text-muted-foreground text-xs truncate px-2 py-1 bg-background rounded-md border border-border/50">{selectedOpp.company.name}</span>
                )}
                <button onClick={handleClearOpp} className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                >
                  <span>Sélectionner une opportunité</span>
                  <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                </button>
                {dropdownOpen && (
                  <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Rechercher..."
                        className="h-7 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : opportunities.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">Aucun résultat</p>
                      ) : opportunities.map(opp => (
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

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="ghost" onClick={() => router.back()} disabled={isSubmitting} className="rounded-full font-medium">
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting || !title.trim()} className="rounded-full shadow-md px-6" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {isSubmitting ? "Création en cours..." : "Créer le devis"}
          </Button>
        </div>
      </div>
    </div>
  )
}
