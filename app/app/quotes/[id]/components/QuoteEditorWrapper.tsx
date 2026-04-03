"use client"

import { QuoteEditorPageSkeleton } from "@/app/app/_components/page-skeletons"
import { useQuote } from "@/hooks/use-quotes"
import { QuoteEditor } from "./QuoteEditor"
import { useAgency } from "@/providers/agency-provider"
import { isProPlan } from "@/lib/validators/agency"
import { ProPageGate } from "@/components/pro-page-gate"

export default function QuoteEditorWrapper({ id }: { id: string }) {
  const { agency } = useAgency()
  const { data: quote, isLoading, error } = useQuote(id)

  if (!agency || !isProPlan(agency)) {
    return <ProPageGate feature="quotes" />
  }

  if (isLoading) return <QuoteEditorPageSkeleton />
  if (error || !quote) return <div className="p-8 text-destructive">Devis introuvable.</div>

  return <QuoteEditor quote={quote} />
}
