import { getPublicQuote } from "@/actions/quotes.server"
import { computeQuoteTotals, PAYMENT_TERMS_LABELS } from "@/lib/validators/quotes"
import { notFound } from "next/navigation"
import { PrintButton } from "./print-button"

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
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

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
  const hasConditions = quote.payment_terms_preset || quote.payment_terms_notes || quote.service_start_date || quote.notes

  const validityDays = quote.valid_until && quote.created_at
    ? Math.round((new Date(quote.valid_until).getTime() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const hasTotalsBreakdown = totals.discountAmount > 0 || (quote.tax_rate != null && quote.tax_rate > 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #f0f0ec; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
        .doc { background: white; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .doc { box-shadow: none !important; }
          .page-container { padding: 0 !important; }
        }
      `}</style>

      <div className="page-container" style={{ minHeight: "100vh", padding: "2.5rem 1rem" }}>
        <div className="doc" style={{
          maxWidth: "820px",
          margin: "0 auto",
          padding: "56px 64px",
          boxShadow: "0 12px 48px -8px rgba(0,0,0,0.10), 0 2px 8px -2px rgba(0,0,0,0.04)",
        }}>

          {isExpired && (
            <div className="no-print" style={{
              background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "4px",
              padding: "10px 16px", fontSize: "13px", color: "#92400e",
              fontWeight: 500, marginBottom: "32px",
            }}>
              ⚠️ Ce devis a expiré le {new Date(quote.valid_until!).toLocaleDateString("fr-FR")}.
            </div>
          )}

          {/* ── HEADER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
            {/* Agency */}
            <div style={{ fontSize: "13px", lineHeight: "1.65", color: "#444" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", marginBottom: "2px" }}>
                {agency?.name || "Agence"}
              </div>
              {agency?.email && <div>{agency.email}</div>}
              {agency?.phone && <div>{agency.phone}</div>}
              {agency?.address && <div style={{ whiteSpace: "pre-wrap" }}>{agency.address}</div>}
              {(agency?.rcs_number || agency?.vat_number) && (
                <div style={{ marginTop: "6px", color: "#999", fontSize: "11px" }}>
                  {[agency?.rcs_number && `RCS ${agency.rcs_number}`, agency?.vat_number && `TVA ${agency.vat_number}`].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {/* Quote reference */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#999", marginBottom: "6px" }}>
                Devis
              </div>
              <div style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1a1a1a", lineHeight: 1 }}>
                {quote.title}
              </div>
              {quote.created_at && (
                <div style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                  Émis le {fmtDate(quote.created_at)}
                </div>
              )}
            </div>
          </div>

          {/* Heavy rule */}
          <hr style={{ border: "none", borderTop: "1.5px solid #1a1a1a", marginBottom: "32px" }} />

          {/* ── CLIENT + DATES ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "32px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", marginBottom: "10px" }}>
                Client
              </div>
              <div style={{ fontWeight: 700, fontSize: "18px", color: "#1a1a1a", marginBottom: "6px" }}>
                {company?.name || "—"}
              </div>
              <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.65" }}>
                {company?.contact_name && <div>{company.contact_name}</div>}
                {company?.email && <div>{company.email}</div>}
                {company?.billing_address && <div style={{ whiteSpace: "pre-wrap", marginTop: "2px" }}>{company.billing_address}</div>}
                {company?.business_sector && <div style={{ marginTop: "4px", color: "#777" }}>{company.business_sector}</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", marginBottom: "2px" }}>Date d'émission</div>
                <div style={{ fontSize: "13px", color: "#555" }}>
                  {quote.created_at ? fmtDate(quote.created_at) : "—"}
                </div>
              </div>
              {quote.valid_until && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", marginBottom: "2px" }}>Validité</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>
                    {validityDays != null ? `${validityDays} jours — jusqu'au ` : "Jusqu'au "}
                    {fmtDate(quote.valid_until)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Light rule */}
          <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", marginBottom: "32px" }} />

          {/* ── DESCRIPTION ── */}
          {quote.description && (
            <p style={{ fontSize: "14px", lineHeight: "1.75", marginBottom: "40px", color: "#333", whiteSpace: "pre-wrap" }}>
              {quote.description}
            </p>
          )}

          {/* ── PRESTATIONS TABLE ── */}
          <div style={{ marginBottom: "0" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", marginBottom: "14px" }}>
              Détail des prestations
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a1a1a", color: "#fff" }}>
                  <th style={{ textAlign: "left", padding: "13px 16px", fontWeight: 600, fontSize: "12px", letterSpacing: "0.2px" }}>
                    Prestation
                  </th>
                  <th style={{ textAlign: "center", padding: "13px 12px", fontWeight: 600, fontSize: "12px", width: "90px" }}>
                    Jours / Qté
                  </th>
                  <th style={{ textAlign: "center", padding: "13px 12px", fontWeight: 600, fontSize: "12px", width: "110px" }}>
                    TJM / P.U.
                  </th>
                  <th style={{ textAlign: "right", padding: "13px 16px", fontWeight: 600, fontSize: "12px", width: "110px" }}>
                    Total HT
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f5" }}>
                    <td style={{ padding: "16px 16px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>{item.label}</div>
                      {item.description && (
                        <div style={{ fontSize: "12.5px", color: "#666", marginTop: "4px", lineHeight: "1.55", whiteSpace: "pre-wrap" }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "16px 12px", fontSize: "14px", color: "#333", verticalAlign: "top" }}>
                      {item.quantity}{item.type !== "expense" ? "j" : ""}
                    </td>
                    <td style={{ textAlign: "center", padding: "16px 12px", fontSize: "14px", color: "#333", verticalAlign: "top" }}>
                      {fmt(item.unit_price, quote.currency)}
                    </td>
                    <td style={{ textAlign: "right", padding: "16px 16px", fontSize: "14px", fontWeight: 700, color: "#1a1a1a", verticalAlign: "top" }}>
                      {fmt(item.quantity * item.unit_price, quote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sub-totals (only when tax/discount applies) */}
            {hasTotalsBreakdown && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: "240px", borderLeft: "1px solid #ebebeb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", fontSize: "13px", color: "#555", borderBottom: "1px solid #ebebeb" }}>
                    <span>Sous-total HT</span>
                    <span>{fmt(totals.subtotal, quote.currency)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", fontSize: "13px", color: "#555", borderBottom: "1px solid #ebebeb" }}>
                      <span>Remise {quote.discount_type === "percentage" ? `(${quote.discount_value}%)` : ""}</span>
                      <span>−{fmt(totals.discountAmount, quote.currency)}</span>
                    </div>
                  )}
                  {quote.tax_rate != null && quote.tax_rate > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", fontSize: "13px", color: "#555" }}>
                      <span>TVA ({quote.tax_rate}%)</span>
                      <span>{fmt(totals.taxAmount, quote.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── TOTAL TTC — full-width dark band ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#1a1a1a", color: "#fff",
            padding: "15px 16px",
            marginBottom: "48px",
          }}>
            <span style={{ fontWeight: 700, fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
              Total TTC
            </span>
            <span style={{ fontWeight: 800, fontSize: "22px", letterSpacing: "-0.3px" }}>
              {fmt(totals.total, quote.currency)}
            </span>
          </div>

          {/* ── CONDITIONS ── */}
          {hasConditions && (
            <>
              <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", marginBottom: "24px" }} />
              <div style={{ marginBottom: "40px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", marginBottom: "18px" }}>
                  Conditions
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px", fontSize: "13px", lineHeight: "1.65" }}>
                  {(quote.payment_terms_preset || quote.payment_terms_notes) && (
                    <div>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>Modalités de paiement</div>
                      <div style={{ color: "#555" }}>
                        {quote.payment_terms_preset && (
                          <div>{PAYMENT_TERMS_LABELS[quote.payment_terms_preset] ?? quote.payment_terms_preset}</div>
                        )}
                        {quote.payment_terms_notes && (
                          <div style={{ whiteSpace: "pre-wrap", marginTop: quote.payment_terms_preset ? "4px" : 0 }}>
                            {quote.payment_terms_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {quote.service_start_date && (
                    <div>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>Délai de réalisation</div>
                      <div style={{ color: "#555" }}>
                        Début : {new Date(quote.service_start_date).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  )}
                  {quote.notes && (
                    <div>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>Inclus dans ce devis</div>
                      <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{quote.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", marginBottom: "40px" }} />
            </>
          )}

          {/* ── SIGNATURE ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "48px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a", marginBottom: "6px" }}>Bon pour accord</div>
              <div style={{ fontSize: "12.5px", color: "#666", lineHeight: "1.6", marginBottom: "52px" }}>
                Date et signature précédées de la mention<br />
                <span style={{ fontStyle: "italic" }}>« Bon pour accord »</span>
              </div>
              <div style={{ borderTop: "1px solid #bbb", paddingTop: "7px", fontSize: "12px", color: "#666" }}>
                {company?.name}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a", marginBottom: "6px" }}>Établi par</div>
              <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.65", marginBottom: "52px" }}>
                {agency?.name && <div>{agency.name}</div>}
                {agency?.email && <div>{agency.email}</div>}
              </div>
              <div style={{ borderTop: "1px solid #bbb", paddingTop: "7px", fontSize: "12px", color: "#666" }}>
                {agency?.name}
              </div>
            </div>
          </div>

          {/* Print button */}
          <div className="no-print" style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
            <PrintButton />
          </div>

        </div>
      </div>
    </>
  )
}
