import { getPublicQuote } from "@/actions/quotes.server"
import { computeQuoteTotals } from "@/lib/validators/quotes"
import { notFound } from "next/navigation"
import { PrintButton } from "./print-button"

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  fixed: "Forfait",
  hourly: "Horaire",
  expense: "Frais",
}

const ITEM_TYPE_COLORS: Record<string, string> = {
  fixed: "bg-blue-100 text-blue-700",
  hourly: "bg-purple-100 text-purple-700",
  expense: "bg-orange-100 text-orange-700",
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const quote = await getPublicQuote(token)

  if (!quote) notFound()

  const agency = quote.agency as any
  const company = quote.company as any
  const items = (quote.items ?? []).sort((a: any, b: any) => a.order - b.order)
  const totals = computeQuoteTotals({
    discount_type: quote.discount_type as any,
    discount_value: quote.discount_value,
    tax_rate: quote.tax_rate,
    items: items.map((i: any) => ({ quantity: i.quantity, unit_price: i.unit_price })),
  })

  const primaryColor = agency?.primary_color || "#2563EB"
  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 print-page overflow-hidden">

          {/* Expiry warning */}
          {isExpired && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800 font-medium no-print">
              ⚠️ Ce devis a expiré le {formatDate(quote.valid_until!)}.
            </div>
          )}

          {/* Header */}
          <div className="px-8 py-8 border-b border-slate-100" style={{ borderTopColor: primaryColor, borderTopWidth: 4 }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {agency?.logo_url ? (
                  <img src={agency.logo_url} alt={agency.name} className="h-10 w-auto object-contain" />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {agency?.name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900">{agency?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">Devis</p>
                <p className="text-sm text-slate-500 mt-1">
                  {quote.created_at && formatDate(quote.created_at)}
                </p>
                {quote.valid_until && (
                  <p className="text-sm text-slate-500">
                    Valable jusqu&apos;au {formatDate(quote.valid_until)}
                  </p>
                )}
              </div>
            </div>

            {company?.name && (
              <div className="mt-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">À l&apos;attention de</p>
                <p className="font-bold text-slate-800 text-lg">{company.name}</p>
              </div>
            )}
          </div>

          {/* Title & description */}
          <div className="px-8 py-6">
            <h1 className="text-2xl font-bold text-slate-900">{quote.title}</h1>
            {quote.description && (
              <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-wrap">{quote.description}</p>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="px-8 pb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    <th className="pb-3 font-semibold text-slate-700">Prestation</th>
                    <th className="pb-3 font-semibold text-slate-700 text-center w-24">Type</th>
                    <th className="pb-3 font-semibold text-slate-700 text-right w-20">Qté</th>
                    <th className="pb-3 font-semibold text-slate-700 text-right w-28">P.U.</th>
                    <th className="pb-3 font-semibold text-slate-700 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        {item.description && (
                          <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_TYPE_COLORS[item.type]}`}>
                          {ITEM_TYPE_LABELS[item.type]}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700 font-mono">
                        {formatCurrency(item.unit_price, quote.currency)}
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(item.quantity * item.unit_price, quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="px-8 pb-6">
            <div className="ml-auto w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span className="font-mono">{formatCurrency(totals.subtotal, quote.currency)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>
                    Remise
                    {quote.discount_type === "percentage" ? ` (${quote.discount_value}%)` : ""}
                  </span>
                  <span className="font-mono text-green-600">
                    -{formatCurrency(totals.discountAmount, quote.currency)}
                  </span>
                </div>
              )}
              {quote.tax_rate != null && quote.tax_rate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>TVA ({quote.tax_rate}%)</span>
                  <span className="font-mono">{formatCurrency(totals.taxAmount, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
                <span>Total {quote.currency}</span>
                <span className="font-mono" style={{ color: primaryColor }}>
                  {formatCurrency(totals.total, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Notes &amp; Conditions</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
            </div>
          )}

          {/* Print button */}
          <div className="px-8 py-4 border-t border-slate-100 flex justify-end no-print">
            <PrintButton />
          </div>
        </div>
      </div>
    </>
  )
}
