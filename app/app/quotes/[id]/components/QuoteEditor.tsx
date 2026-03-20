"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Copy, ExternalLink, Plus, Trash2, GripVertical, Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateQuote, useUpdateQuoteStatus, useAddQuoteItem, useUpdateQuoteItem, useDeleteQuoteItem } from "@/hooks/use-quotes"
import { computeQuoteTotals, ALLOWED_TRANSITIONS, QuoteStatus, QuoteItemType } from "@/lib/validators/quotes"
import { toast } from "sonner"

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  fixed: "Forfait",
  hourly: "Horaire",
  expense: "Frais",
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD"]

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

type QuoteData = any // from useQuote

export function QuoteEditor({ quote }: { quote: QuoteData }) {
  const router = useRouter()
  const updateQuote = useUpdateQuote(quote.id)
  const updateStatus = useUpdateQuoteStatus(quote.id)
  const addItem = useAddQuoteItem(quote.id)
  const updateItem = useUpdateQuoteItem(quote.id)
  const deleteItem = useDeleteQuoteItem(quote.id)

  // Local state for form fields
  const [title, setTitle] = useState(quote.title)
  const [description, setDescription] = useState(quote.description ?? "")
  const [notes, setNotes] = useState(quote.notes ?? "")
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "")
  const [currency, setCurrency] = useState(quote.currency)
  const [discountType, setDiscountType] = useState<string>(quote.discount_type ?? "none")
  const [discountValue, setDiscountValue] = useState<string>(quote.discount_value?.toString() ?? "")
  const [taxRate, setTaxRate] = useState<string>(quote.tax_rate?.toString() ?? "")
  const [isSaving, setIsSaving] = useState(false)

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
      title,
      description: description || null,
      notes: notes || null,
      valid_until: validUntil || null,
      currency,
      discount_type: discountType !== "none" ? (discountType as any) : null,
      discount_value: discountType !== "none" && discountValue ? parseFloat(discountValue) : null,
      tax_rate: taxRate ? parseFloat(taxRate) : null,
    })
    setIsSaving(false)
    if ("error" in result && result.error) {
      toast.error(result.error)
    } else {
      toast.success("Devis sauvegardé")
    }
  }

  const handleStatusChange = async (status: string) => {
    const result = await updateStatus.mutateAsync(status as QuoteStatus)
    if ("error" in result && result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}`)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    toast.success("Lien copié !")
  }

  const handleAddItem = async () => {
    const result = await addItem.mutateAsync({
      type: "fixed",
      label: "Nouvelle prestation",
      quantity: 1,
      unit_price: 0,
      order: items.length,
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

  const allowedTransitions = ALLOWED_TRANSITIONS[quote.status as QuoteStatus] ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/quotes")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold border-0 px-0 h-auto text-foreground bg-transparent focus-visible:ring-0 shadow-none"
            placeholder="Titre du devis"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status]}`}>
            {STATUS_LABELS[quote.status]}
          </span>
          {allowedTransitions.length > 0 && (
            <Select onValueChange={handleStatusChange}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Changer statut" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-1" />
            Copier lien
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              Voir
            </a>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valable jusqu'au</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Introduction</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Message d'introduction du devis..."
              rows={3}
            />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Prestations</Label>
              <Button variant="outline" size="sm" onClick={handleAddItem} disabled={addItem.isPending}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Aucune prestation. Cliquez sur "Ajouter" pour commencer.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-2 w-6" />
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 flex-1">Libellé</th>
                      <th className="px-3 py-2 w-20 text-right">Qté</th>
                      <th className="px-3 py-2 w-28 text-right">P.U. HT</th>
                      <th className="px-3 py-2 w-28 text-right">Total</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item: any) => (
                      <tr key={item.id} className="group">
                        <td className="px-3 py-2 text-muted-foreground/40">
                          <GripVertical className="w-4 h-4" />
                        </td>
                        <td className="px-3 py-2 w-28">
                          <Select
                            value={item.type}
                            onValueChange={(v) => handleUpdateItem(item.id, "type", v)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            defaultValue={item.label}
                            onBlur={(e) => handleUpdateItem(item.id, "label", e.target.value)}
                            className="h-7 text-sm"
                            placeholder="Libellé"
                          />
                        </td>
                        <td className="px-3 py-2 w-20">
                          <Input
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={(e) => handleUpdateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-7 text-sm text-right"
                            min={0}
                          />
                        </td>
                        <td className="px-3 py-2 w-28">
                          <Input
                            type="number"
                            defaultValue={item.unit_price}
                            onBlur={(e) => handleUpdateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                            className="h-7 text-sm text-right"
                            min={0}
                            step={0.01}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-sm">
                          {formatCurrency(item.quantity * item.unit_price, currency)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
            <Label>Notes & Conditions de paiement</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions de paiement, délais, mentions légales..."
              rows={4}
            />
          </div>
        </div>

        {/* Sidebar: Summary */}
        <div className="space-y-4">
          <div className="border border-border rounded-xl p-5 space-y-4 sticky top-6">
            <h3 className="font-semibold text-sm">Récapitulatif</h3>

            {/* Discount */}
            <div className="space-y-2">
              <Label className="text-xs">Remise</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune remise</SelectItem>
                  <SelectItem value="percentage">En pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
              {discountType !== "none" && (
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 100"}
                  className="h-8 text-sm"
                  min={0}
                />
              )}
            </div>

            {/* Tax */}
            <div className="space-y-2">
              <Label className="text-xs">TVA (%)</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="Ex: 20"
                className="h-8 text-sm"
                min={0}
                max={100}
              />
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span className="font-mono">{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise</span>
                  <span className="font-mono">-{formatCurrency(totals.discountAmount, currency)}</span>
                </div>
              )}
              {parseFloat(taxRate) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA ({taxRate}%)</span>
                  <span className="font-mono">{formatCurrency(totals.taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Total {currency}</span>
                <span className="font-mono">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
