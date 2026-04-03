import { Suspense } from "react"
import { QuoteEditorPageSkeleton } from "@/app/app/_components/page-skeletons"
import QuoteEditorWrapper from "./components/QuoteEditorWrapper"

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<QuoteEditorPageSkeleton />}>
      <QuoteEditorWrapper id={id} />
    </Suspense>
  )
}
