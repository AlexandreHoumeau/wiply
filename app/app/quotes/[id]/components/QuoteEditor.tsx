"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Copy, ExternalLink, Plus, Trash2, GripVertical, Save,
  Sparkles, ChevronRight, Check, X, Loader2, RotateCcw, Link2, ChevronsUpDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateQuote, useUpdateQuoteStatus, useAddQuoteItem, useUpdateQuoteItem, useDeleteQuoteItem } from "@/hooks/use-quotes"
import { computeQuoteTotals, ALLOWED_TRANSITIONS, QuoteStatus } from "@/lib/validators/quotes"
import { generateQuoteWithAI, listOpportunitiesForSelect } from "@/actions/quotes.server"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type OpportunityOption = { id: string; name: string; company_id: string | null; company: { id: string; name: string } | null }

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", sent: "Envoyé", accepted: "Accepté", rejected: "Refusé", expired: "Expiré",
}

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  draft:    { dot: "bg-slate-400",   text: "text-slate-600" },
  sent:     { dot: "bg-blue-500",    text: "text-blue-700" },
  accepted: { dot: "bg-emerald-500", text: "text-emerald-700" },
  rejected: { dot: "bg-red-500",     text: "text-red-700" },
  expired:  { dot: "bg-amber-500",   text: "text-amber-700" },
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  fixed: "Forfait", hourly: "Horaire", expense: "Frais",
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD"]

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

type QuoteData = any

export function QuoteEditor({ quote }: { quote: QuoteData }) {
  const router = useRouter()
  const updateQuote = useUpdateQuote(quote.id)
  const updateStatus = useUpdateQuoteStatus(quote.id)
  const addItem = useAddQuoteItem(quote.id)
  const updateItem = useUpdateQuoteItem(quote.id)
  const deleteItem = useDeleteQuoteItem(quote.id)

  const [title, setTitle] = useState(quote.title)
  const [description, setDescription] = useState(quote.description ?? "")
  const [notes, setNotes] = useState(quote.notes ?? "")
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "")
  const [currency, setCurrency] = useState(quote.currency)
  const [discountType, setDiscountType] = useState<string>(quote.discount_type ?? "none")
  const [discountValue, setDiscountValue] = useState<string>(quote.discount_value?.toString() ?? "")
  const [taxRate, setTaxRate] = useState<string>(quote.tax_rate?.toString() ?? "")
  const [isSaving, setIsSaving] = useState(false)

  // Opportunity linking
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([])
  const [selectedOpp, setSelectedOpp] = useState<OpportunityOption | null>(
    quote.opportunity ? { id: (quote.opportunity as any).id, name: (quote.opportunity as any).name, company_id: quote.company_id, company: quote.company as any } : null
  )
  const [oppDropdownOpen, setOppDropdownOpen] = useState(false)
  const [oppSearch, setOppSearch] = useState("")

  useEffect(() => { listOpportunitiesForSelect().then(setOpportunities) }, [])

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<{
    description: string
    items: Array<{ type: string; label: string; description?: string; quantity: number; unit_price: number }>
  } | null>(null)

  const items = (quote.items ?? []).sort((a: any, b: any) => a.order - b.order)

  const totals = computeQuoteTotals({
    discount_type: discountType !== "none" ? (discountType as any) : null,
    discount_value: discountValue ? parseFloat(discountValue) : null,
    tax_rate: taxRate ? parseFloat(taxRate) : null,
    items: items.map((i: any) => ({ quantity: i.quantity, unit_price: i.unit_price })),
  })

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/devis/${quote.token}`
    : `/devis/${quote.token}`

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateQuote.mutateAsync({
      title, description: description || null, notes: notes || null, valid_until: validUntil || null,
      currency,
      discount_type: discountType !== "none" ? (discountType as any) : null,
      discount_value: discountType !== "none" && discountValue ? parseFloat(discountValue) : null,
      tax_rate: taxRate ? parseFloat(taxRate) : null,
      opportunity_id: selectedOpp?.id ?? null,
      company_id: selectedOpp?.company_id ?? null,
    })
    setIsSaving(false)
    if ("error" in result && result.error) toast.error(result.error)
    else toast.success("Devis sauvegardé")
  }

  const handleSelectOpp = async (opp: OpportunityOption) => {
    setSelectedOpp(opp)
    setOppDropdownOpen(false)
    setOppSearch("")
  }

  const handleClearOpp = () => {
    setSelectedOpp(null)
  }

  const handleStatusChange = async (status: string) => {
    const result = await updateStatus.mutateAsync(status as QuoteStatus)
    if ("error" in result && result.error) toast.error(result.error)
    else toast.success(`Statut : ${STATUS_LABELS[status]}`)
  }

  const handleAddItem = async () => {
    const result = await addItem.mutateAsync({
      type: "fixed", label: "Nouvelle prestation", quantity: 1, unit_price: 0, order: items.length,
    })
    if ("error" in result && result.error) toast.error(result.error)
  }

  const handleUpdateItem = async (id: string, field: string, value: any) => {
    const result = await updateItem.mutateAsync({ id, item: { [field]: value } })
    if ("error" in result && result.error) toast.error(result.error)
  }

  const handleDeleteItem = async (id: string) => {
    const result = await deleteItem.mutateAsync(id)
    if ("error" in result && result.error) toast.error(result.error)
  }

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error("Décrivez votre projet")
    setIsGenerating(true)
    setAiPreview(null)
    // Save opportunity/company link first so AI can fetch them
    if (selectedOpp?.id !== (quote.opportunity as any)?.id) {
      await updateQuote.mutateAsync({
        opportunity_id: selectedOpp?.id ?? null,
        company_id: selectedOpp?.company_id ?? null,
      })
    }
    const result = await generateQuoteWithAI({
      quoteId: quote.id,
      prompt: aiPrompt,
    })
    setIsGenerating(false)
    if (result.error) { toast.error(result.error); return }
    setAiPreview(result.data!)
  }

  const handleApplyAI = async () => {
    if (!aiPreview) return
    if (aiPreview.description) setDescription(aiPreview.description)
    let order = items.length
    for (const item of aiPreview.items) {
      await addItem.mutateAsync({
        type: item.type as any,
        label: item.label,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        order: order++,
      })
    }
    toast.success(`${aiPreview.items.length} prestation(s) ajoutée(s)`)
    setAiPreview(null)
    setAiPrompt("")
    setAiOpen(false)
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[quote.status as QuoteStatus] ?? []
  const statusStyle = STATUS_STYLES[quote.status] ?? STATUS_STYLES.draft

  return (
    <div className="flex flex-col h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={() => router.push("/app/quotes")}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50 min-w-0"
          placeholder="Titre du devis"
        />

        <div className="flex items-center gap-2 shrink-0">
          {/* Status pill */}
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60", statusStyle.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
            {STATUS_LABELS[quote.status]}
          </span>

          {/* Status transition */}
          {allowedTransitions.length > 0 && (
            <Select onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs border-dashed">
                <SelectValue placeholder="Changer le statut" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="h-5 w-px bg-border mx-1" />

          <button
            onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Lien copié !") }}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lien</span>
          </button>
          <a
            href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voir</span>
          </a>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? "..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valable jusqu'au</Label>
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opportunity link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Opportunité liée
            </Label>
            {selectedOpp ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 text-sm">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="flex-1 truncate font-medium">{selectedOpp.name}</span>
                {selectedOpp.company && <span className="text-muted-foreground text-xs truncate">{selectedOpp.company.name}</span>}
                <button onClick={handleClearOpp} className="text-muted-foreground hover:text-foreground transition-colors text-xs shrink-0">✕</button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOppDropdownOpen(!oppDropdownOpen)}
                  className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Lier à une opportunité</span>
                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
                </button>
                {oppDropdownOpen && (
                  <div className="absolute z-50 top-10 left-0 right-0 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input value={oppSearch} onChange={e => setOppSearch(e.target.value)} placeholder="Rechercher..." className="h-7 text-sm" autoFocus />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {opportunities.filter(o =>
                        o.name.toLowerCase().includes(oppSearch.toLowerCase()) ||
                        (o.company?.name ?? "").toLowerCase().includes(oppSearch.toLowerCase())
                      ).map(opp => (
                        <button key={opp.id} type="button" onClick={() => handleSelectOpp(opp)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{opp.name}</p>
                            {opp.company && <p className="text-xs text-muted-foreground truncate">{opp.company.name}</p>}
                          </div>
                        </button>
                      ))}
                      {opportunities.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Aucune opportunité</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Introduction */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Introduction</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Présentation du projet, contexte, objectifs..."
              rows={3}
              className="resize-none text-sm leading-relaxed"
            />
          </div>

          {/* AI Banner */}
          <div className={cn(
            "rounded-xl border transition-all duration-200 overflow-hidden",
            aiOpen ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/3" : "border-dashed border-border hover:border-[var(--brand-primary)]/40"
          )}>
            <button
              onClick={() => setAiOpen(!aiOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: "var(--brand-primary)1a" }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">Générer avec l'IA</span>
                <span className="text-xs text-muted-foreground ml-2">Décrivez votre projet, l'IA propose le devis</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", aiOpen && "rotate-90")} />
            </button>

            {aiOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--brand-primary)]/10">
                <div className="pt-3 space-y-2">
                  <Textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Ex : Refonte complète du site web d'un cabinet d'avocats. Inclure UX/UI design, développement React, migration de contenu et formation de l'équipe."
                    rows={3}
                    className="resize-none text-sm bg-background"
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate() }}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="flex items-center gap-2 h-8 px-4 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                    style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Générer</>
                    )}
                  </button>
                </div>

                {aiPreview && (
                  <div className="space-y-3 border-t border-[var(--brand-primary)]/10 pt-3">
                    <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Introduction générée</p>
                      <p className="text-sm text-foreground leading-relaxed">{aiPreview.description}</p>
                    </div>

                    <div className="rounded-lg border border-border bg-background overflow-hidden">
                      <div className="px-3 py-2 border-b border-border bg-muted/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {aiPreview.items.length} prestation(s) suggérée(s)
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {aiPreview.items.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.type]} · ×{item.quantity}</p>
                              <p className="text-sm font-mono font-semibold">{fmt(item.unit_price, currency)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApplyAI}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold"
                        style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Appliquer tout
                      </button>
                      <button
                        onClick={() => setAiPreview(null)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Régénérer
                      </button>
                      <button
                        onClick={() => { setAiPreview(null); setAiOpen(false) }}
                        className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prestations</Label>
              <button
                onClick={handleAddItem}
                disabled={addItem.isPending}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              {items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucune prestation —{" "}
                  <button onClick={handleAddItem} className="underline underline-offset-2 hover:text-foreground transition-colors">
                    ajouter une ligne
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr className="text-left">
                      <th className="pl-3 pr-1 py-2 w-5" />
                      <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Type</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Libellé</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right w-16">Qté</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right w-28">Prix unit.</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right w-24">Total</th>
                      <th className="pl-1 pr-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => (
                      <tr key={item.id} className={cn("group", i !== 0 && "border-t border-border")}>
                        <td className="pl-3 pr-1 py-2 text-muted-foreground/30 cursor-grab">
                          <GripVertical className="w-3.5 h-3.5" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={item.type} onValueChange={v => handleUpdateItem(item.id, "type", v)}>
                            <SelectTrigger className="h-7 text-xs border-transparent bg-muted/50 hover:bg-muted focus:bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            key={`label-${item.id}-${item.label}`}
                            defaultValue={item.label}
                            onBlur={e => { if (e.target.value !== item.label) handleUpdateItem(item.id, "label", e.target.value) }}
                            className="w-full h-7 px-2 rounded-md text-sm bg-transparent hover:bg-muted/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/30 transition-colors"
                            placeholder="Libellé"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            key={`qty-${item.id}-${item.quantity}`}
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v !== item.quantity) handleUpdateItem(item.id, "quantity", v) }}
                            className="w-full h-7 px-2 rounded-md text-sm text-right bg-transparent hover:bg-muted/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/30 transition-colors"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            key={`price-${item.id}-${item.unit_price}`}
                            type="number"
                            defaultValue={item.unit_price}
                            onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v !== item.unit_price) handleUpdateItem(item.id, "unit_price", v) }}
                            className="w-full h-7 px-2 rounded-md text-sm text-right font-mono bg-transparent hover:bg-muted/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/30 transition-colors"
                            min={0} step={0.01}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-semibold text-sm tabular-nums">
                          {fmt(item.quantity * item.unit_price, currency)}
                        </td>
                        <td className="pl-1 pr-3 py-2">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes & Conditions</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Conditions de paiement, délais, mentions légales..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* Right sidebar: Summary */}
        <div className="w-72 shrink-0 border-l border-border overflow-y-auto p-5 space-y-5 hidden lg:block">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</h3>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Remise</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune remise</SelectItem>
                <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                <SelectItem value="fixed">Montant fixe (€)</SelectItem>
              </SelectContent>
            </Select>
            {discountType !== "none" && (
              <div className="relative">
                <Input
                  type="number"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "100"}
                  className="h-8 text-sm pr-8"
                  min={0}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {discountType === "percentage" ? "%" : "€"}
                </span>
              </div>
            )}
          </div>

          {/* Tax */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">TVA</Label>
            <div className="relative">
              <Input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                placeholder="20"
                className="h-8 text-sm pr-8"
                min={0} max={100}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-border space-y-2.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Sous-total</span>
              <span className="font-mono tabular-nums">{fmt(totals.subtotal, currency)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Remise{discountType === "percentage" && discountValue ? ` (${discountValue}%)` : ""}</span>
                <span className="font-mono tabular-nums">−{fmt(totals.discountAmount, currency)}</span>
              </div>
            )}
            {parseFloat(taxRate) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>TVA ({taxRate}%)</span>
                <span className="font-mono tabular-nums">{fmt(totals.taxAmount, currency)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-border flex justify-between items-baseline">
              <span className="text-sm font-semibold">Total {currency}</span>
              <span
                className="text-2xl font-bold font-mono tabular-nums"
                style={{ color: "var(--brand-primary)" }}
              >
                {fmt(totals.total, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
