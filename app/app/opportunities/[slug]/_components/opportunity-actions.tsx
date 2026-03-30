// opportunity-actions.tsx
"use client"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import type { OpportunityWithCompany } from "@/lib/validators/oppotunities"

export default function OpportunityActions({ opportunity }: { opportunity: OpportunityWithCompany }) {
  const router = useRouter()

  const handleCreateQuote = () => {
    const params = new URLSearchParams()
    if (opportunity?.id) params.set("opportunityId", opportunity.id)
    if (opportunity?.company_id) params.set("companyId", opportunity.company_id)
    router.push(`/app/quotes/new?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>

      <div className="p-4 flex flex-col gap-2">
        <Button variant="default">Passer en "Contacté"</Button>
        <Button variant="outline">Ajouter une note</Button>
        <Button variant="outline" onClick={handleCreateQuote}>
          <FileText className="w-4 h-4 mr-2" />
          Créer un devis
        </Button>
        <Button variant="destructive">Archiver</Button>
      </div>
    </Card>
  )
}
