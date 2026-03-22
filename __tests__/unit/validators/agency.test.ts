import { describe, it, expect } from "vitest"
import { legalFormSchema, updateAgencySchema } from "@/lib/validators/agency"

describe("legalFormSchema", () => {
  it("accepte les formes légales valides", () => {
    for (const form of ["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"]) {
      expect(legalFormSchema.safeParse(form).success).toBe(true)
    }
  })

  it("rejette une forme légale inconnue", () => {
    expect(legalFormSchema.safeParse("SCOP").success).toBe(false)
  })
})

describe("updateAgencySchema — champs légaux", () => {
  const base = {
    agency_id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Mon Agence",
  }

  it("accepte les champs légaux absents", () => {
    const r = updateAgencySchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it("accepte un vat_number au format FR valide", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "FR12345678901" })
    expect(r.success).toBe(true)
  })

  it("rejette un vat_number au mauvais format", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "12345678901" })
    expect(r.success).toBe(false)
  })

  it("accepte legal_name et rcs_number libres", () => {
    const r = updateAgencySchema.safeParse({ ...base, legal_name: "ACME SAS", rcs_number: "RCS Paris 123456789" })
    expect(r.success).toBe(true)
  })

  it("accepte vat_number vide (pour effacer le champ)", () => {
    const r = updateAgencySchema.safeParse({ ...base, vat_number: "" })
    expect(r.success).toBe(true)
  })
})
