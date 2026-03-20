import { getPublicQuote } from "@/actions/quotes.server"
import { computeQuoteTotals } from "@/lib/validators/quotes"
import { notFound } from "next/navigation"
import { PrintButton } from "./print-button"

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

const TYPE_LABELS: Record<string, string> = {
  fixed: "Forfait", hourly: "Taux horaire", expense: "Frais",
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

  const primary = agency?.primary_color || "#1a1a2e"
  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #f4f4f0; }

        .doc { background: white; }
        .mono { font-family: 'DM Mono', 'Courier New', monospace; }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .doc { box-shadow: none !important; }
          .page-container { padding: 0 !important; }
        }
      `}</style>

      <div className="page-container" style={{ minHeight: "100vh", background: "#f4f4f0", padding: "2.5rem 1rem" }}>
        <div className="doc" style={{
          maxWidth: "780px",
          margin: "0 auto",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        }}>

          {/* Expiry banner */}
          {isExpired && (
            <div className="no-print" style={{
              background: "#fffbeb", borderBottom: "1px solid #fde68a",
              padding: "10px 32px", fontSize: "13px", color: "#92400e", fontWeight: 500
            }}>
              ⚠️ Ce devis a expiré le {fmtDate(quote.valid_until!)}.
            </div>
          )}

          {/* Header: color bar + agency + ref */}
          <div style={{ borderTop: `5px solid ${primary}` }}>
            <div style={{ padding: "36px 40px 32px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>

                {/* Agency brand */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {agency?.logo_url ? (
                    <img src={agency.logo_url} alt={agency.name} style={{ height: "44px", width: "auto", objectFit: "contain" }} />
                  ) : (
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      background: primary, display: "flex", alignItems: "center",
                      justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px"
                    }}>
                      {agency?.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#0f0f0f" }}>{agency?.name}</div>
                  </div>
                </div>

                {/* Document info */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.5px" }}>DEVIS</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                    Émis le {quote.created_at ? fmtDate(quote.created_at) : "—"}
                  </div>
                  {quote.valid_until && (
                    <div style={{ fontSize: "12px", color: isExpired ? "#ef4444" : "#9ca3af" }}>
                      Valable jusqu&apos;au {fmtDate(quote.valid_until)}
                    </div>
                  )}
                </div>
              </div>

              {/* Client */}
              {company?.name && (
                <div style={{
                  marginTop: "28px",
                  padding: "16px 20px",
                  background: "#fafafa",
                  borderRadius: "10px",
                  borderLeft: `3px solid ${primary}`
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "4px" }}>
                    À l&apos;attention de
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "#0f0f0f" }}>{company.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Title + description */}
          <div style={{ padding: "28px 40px 24px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f0f0f", letterSpacing: "-0.3px" }}>{quote.title}</h1>
            {quote.description && (
              <p style={{ marginTop: "10px", fontSize: "14px", lineHeight: 1.7, color: "#4b5563", whiteSpace: "pre-wrap" }}>
                {quote.description}
              </p>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div style={{ padding: "0 40px 28px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af" }}>Prestation</th>
                    <th style={{ textAlign: "center", padding: "8px 8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", width: "90px" }}>Type</th>
                    <th style={{ textAlign: "right", padding: "8px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", width: "50px" }}>Qté</th>
                    <th style={{ textAlign: "right", padding: "8px 0 8px 12px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", width: "110px" }}>P.U. HT</th>
                    <th style={{ textAlign: "right", padding: "8px 0 8px 12px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", width: "110px" }}>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "14px 0" }}>
                        <div style={{ fontWeight: 600, color: "#0f0f0f" }}>{item.label}</div>
                        {item.description && <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{item.description}</div>}
                      </td>
                      <td style={{ textAlign: "center", padding: "14px 8px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: item.type === "fixed" ? "#f1f5f9" : item.type === "hourly" ? "#f5f3ff" : "#fffbeb",
                          color: item.type === "fixed" ? "#475569" : item.type === "hourly" ? "#7c3aed" : "#d97706",
                        }}>
                          {TYPE_LABELS[item.type]}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "14px 0", color: "#4b5563", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: "right", padding: "14px 0 14px 12px", color: "#4b5563", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                        {fmt(item.unit_price, quote.currency)}
                      </td>
                      <td style={{ textAlign: "right", padding: "14px 0 14px 12px", fontWeight: 700, color: "#0f0f0f", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                        {fmt(item.quantity * item.unit_price, quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div style={{ padding: "0 40px 32px" }}>
            <div style={{ marginLeft: "auto", maxWidth: "280px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#6b7280" }}>
                <span>Sous-total HT</span>
                <span style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>{fmt(totals.subtotal, quote.currency)}</span>
              </div>

              {totals.discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#059669" }}>
                  <span>Remise {quote.discount_type === "percentage" ? `(${quote.discount_value}%)` : ""}</span>
                  <span style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>−{fmt(totals.discountAmount, quote.currency)}</span>
                </div>
              )}

              {quote.tax_rate != null && quote.tax_rate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#6b7280" }}>
                  <span>TVA ({quote.tax_rate}%)</span>
                  <span style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}>{fmt(totals.taxAmount, quote.currency)}</span>
                </div>
              )}

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "8px", paddingTop: "14px",
                borderTop: "2px solid #e5e7eb"
              }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f0f0f" }}>Total TTC</span>
                <span style={{ fontSize: "26px", fontWeight: 800, color: primary, letterSpacing: "-0.5px", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                  {fmt(totals.total, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div style={{ padding: "20px 40px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "8px" }}>
                Notes &amp; Conditions
              </div>
              <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {quote.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="no-print" style={{
            padding: "16px 40px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end"
          }}>
            <PrintButton />
          </div>
        </div>
      </div>
    </>
  )
}
