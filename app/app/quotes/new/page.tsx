"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { createQuote } from "@/actions/quotes.server"
import { toast } from "sonner"

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { agency } = useAgency()
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const opportunityId = searchParams.get("opportunityId")
  const companyId = searchParams.get("companyId")

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

        {opportunityId && (
          <p className="text-sm text-muted-foreground">
            Ce devis sera lié à l'opportunité sélectionnée.
          </p>
        )}
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
