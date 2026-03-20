import { describe, it, expect } from "vitest"
import { computeQuoteTotals, ALLOWED_TRANSITIONS } from "@/lib/validators/quotes"

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
