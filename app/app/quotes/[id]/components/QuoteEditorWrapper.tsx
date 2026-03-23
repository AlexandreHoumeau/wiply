"use client"

import { useQuote } from "@/hooks/use-quotes"
import { QuoteEditor } from "./QuoteEditor"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function QuoteEditorWrapper({ id }: { id: string }) {
  const router = useRouter()
  const { agency } = useAgency()
  const { data: quote, isLoading, error } = useQuote(id)

  if (!agency || !isProPlan(agency)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Fonctionnalité PRO</h2>
          <p className="text-muted-foreground max-w-md mt-1">Les devis sont disponibles sur le plan PRO.</p>
        </div>
        <Button onClick={() => router.push("/app/agency/billing")}>Passer au plan PRO</Button>
      </div>
    )
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Chargement...</div>
  if (error || !quote) return <div className="p-8 text-destructive">Devis introuvable.</div>

  return <QuoteEditor quote={quote} />
}
