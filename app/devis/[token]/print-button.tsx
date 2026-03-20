"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
    >
      Imprimer / Exporter en PDF
    </button>
  )
}
