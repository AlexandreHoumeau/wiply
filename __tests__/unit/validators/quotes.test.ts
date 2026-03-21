import { describe, it, expect } from "vitest"
import { computeQuoteTotals, ALLOWED_TRANSITIONS, QuoteSchema } from "@/lib/validators/quotes"

describe("computeQuoteTotals", () => {
  it("retourne des zéros sans items", () => {
    const r = computeQuoteTotals({ discount_type: null, discount_value: null, tax_rate: null, items: [] })
    expect(r.subtotal).toBe(0)
    expect(r.discountAmount).toBe(0)
    expect(r.taxAmount).toBe(0)
    expect(r.total).toBe(0)
  })

  it("calcule le sous-total correctement", () => {
    const r = computeQuoteTotals({
      discount_type: null,
      discount_value: null,
      tax_rate: null,
      items: [
        { quantity: 2, unit_price: 100 },
        { quantity: 3, unit_price: 50 },
      ],
    })
    expect(r.subtotal).toBe(350) // 2*100 + 3*50
    expect(r.total).toBe(350)
  })

  it("applique une remise en pourcentage", () => {
    const r = computeQuoteTotals({
      discount_type: "percentage",
      discount_value: 10,
      tax_rate: null,
      items: [{ quantity: 1, unit_price: 1000 }],
    })
    expect(r.discountAmount).toBe(100) // 10% de 1000
    expect(r.total).toBe(900)
  })

  it("applique une remise fixe", () => {
    const r = computeQuoteTotals({
      discount_type: "fixed",
      discount_value: 50,
      tax_rate: null,
      items: [{ quantity: 1, unit_price: 500 }],
    })
    expect(r.discountAmount).toBe(50)
    expect(r.total).toBe(450)
  })

  it("applique la TVA après remise", () => {
    const r = computeQuoteTotals({
      discount_type: "percentage",
      discount_value: 10,
      tax_rate: 20,
      items: [{ quantity: 1, unit_price: 1000 }],
    })
    // subtotal=1000, discount=100, taxBase=900, tax=180, total=1080
    expect(r.subtotal).toBe(1000)
    expect(r.discountAmount).toBe(100)
    expect(r.taxAmount).toBe(180)
    expect(r.total).toBe(1080)
  })

  it("ignore la remise si discount_type est null", () => {
    const r = computeQuoteTotals({
      discount_type: null,
      discount_value: 100,
      tax_rate: null,
      items: [{ quantity: 1, unit_price: 500 }],
    })
    expect(r.discountAmount).toBe(0)
    expect(r.total).toBe(500)
  })

  it("ignore la TVA si tax_rate est null", () => {
    const r = computeQuoteTotals({
      discount_type: null,
      discount_value: null,
      tax_rate: null,
      items: [{ quantity: 1, unit_price: 500 }],
    })
    expect(r.taxAmount).toBe(0)
    expect(r.total).toBe(500)
  })
})

describe("ALLOWED_TRANSITIONS", () => {
  it("draft peut passer à sent ou expired", () => {
    expect(ALLOWED_TRANSITIONS.draft).toContain("sent")
    expect(ALLOWED_TRANSITIONS.draft).toContain("expired")
    expect(ALLOWED_TRANSITIONS.draft).not.toContain("accepted")
  })

  it("sent peut passer à accepted, rejected ou expired", () => {
    expect(ALLOWED_TRANSITIONS.sent).toContain("accepted")
    expect(ALLOWED_TRANSITIONS.sent).toContain("rejected")
    expect(ALLOWED_TRANSITIONS.sent).toContain("expired")
  })

  it("accepted ne peut plus revenir à draft", () => {
    expect(ALLOWED_TRANSITIONS.accepted).not.toContain("draft")
    expect(ALLOWED_TRANSITIONS.accepted).not.toContain("sent")
  })

  it("expired n'a plus de transitions", () => {
    expect(ALLOWED_TRANSITIONS.expired).toHaveLength(0)
  })
})

describe("QuoteSchema new fields", () => {
  const baseQuote = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    agency_id: "550e8400-e29b-41d4-a716-446655440001",
    company_id: null,
    opportunity_id: null,
    title: "Test",
    status: "draft" as const,
    token: "abc123",
    valid_until: null,
    currency: "EUR",
    discount_type: null,
    discount_value: null,
    tax_rate: null,
    notes: null,
  }

  it("accepte service_start_date null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, service_start_date: null })
    expect(r.success).toBe(true)
  })

  it("accepte service_start_date comme string ISO", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, service_start_date: "2026-04-01" })
    expect(r.success).toBe(true)
  })

  it("accepte payment_terms_preset null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: null })
    expect(r.success).toBe(true)
  })

  it("accepte payment_terms_preset valide", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: "30_days" })
    expect(r.success).toBe(true)
  })

  it("rejette payment_terms_preset invalide", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_preset: "invalid_value" })
    expect(r.success).toBe(false)
  })

  it("accepte payment_terms_notes null", () => {
    const r = QuoteSchema.safeParse({ ...baseQuote, payment_terms_notes: null })
    expect(r.success).toBe(true)
  })
})
