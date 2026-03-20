import { Suspense } from "react"
import QuoteEditorWrapper from "./components/QuoteEditorWrapper"

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Chargement...</div>}>
      <QuoteEditorWrapper id={id} />
    </Suspense>
  )
}
