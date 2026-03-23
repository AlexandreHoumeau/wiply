import { describe, it, expect } from "vitest";
import { opportunitySchema } from "@/lib/validators/oppotunities";

const validBase = {
  name: "Refonte site web",
  description: "Description optionnelle",
  company_name: "ACME Corp",
  company_email: "contact@acme.com",
  company_phone: "0612345678",
  company_website: "",
  company_address: "",
  company_sector: "",
  company_links: [] as { label: string; url: string }[],
  status: "to_do" as const,
  contact_via: "email" as const,
};

describe("opportunitySchema — champs obligatoires", () => {
  it("valide un payload complet et correct", () => {
    const result = opportunitySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejette si name est vide", () => {
    const result = opportunitySchema.safeParse({ ...validBase, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejette si company_name est vide", () => {
    const result = opportunitySchema.safeParse({ ...validBase, company_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un statut inconnu", () => {
    const result = opportunitySchema.safeParse({ ...validBase, status: "pending" });
    expect(result.success).toBe(false);
  });

  it("rejette un contact_via inconnu", () => {
    const result = opportunitySchema.safeParse({ ...validBase, contact_via: "fax" });
    expect(result.success).toBe(false);
  });
});

describe("opportunitySchema — règle contact_via=email", () => {
  it("rejette si email vide avec contact_via=email", () => {
    const result = opportunitySchema.safeParse({
      ...validBase,
      contact_via: "email",
      company_email: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes("company_email"));
      expect(emailError).toBeDefined();
    }
  });

  it("accepte si email absent avec contact_via=linkedin", () => {
    const result = opportunitySchema.safeParse({
      ...validBase,
      contact_via: "linkedin",
      company_email: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un email valide avec contact_via=email", () => {
    const result = opportunitySchema.safeParse({
      ...validBase,
      contact_via: "email",
      company_email: "valid@company.fr",
    });
    expect(result.success).toBe(true);
  });
});

describe("opportunitySchema — règle contact_via=phone", () => {
  it("rejette si téléphone vide avec contact_via=phone", () => {
    const result = opportunitySchema.safeParse({
      ...validBase,
      contact_via: "phone",
      company_email: "",
      company_phone: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneError = result.error.issues.find((i) => i.path.includes("company_phone"));
      expect(phoneError).toBeDefined();
    }
  });

  it("accepte si téléphone renseigné avec contact_via=phone", () => {
    const result = opportunitySchema.safeParse({
      ...validBase,
      contact_via: "phone",
      company_email: "",
      company_phone: "0612345678",
    });
    expect(result.success).toBe(true);
  });

  it("accepte tous les statuts valides", () => {
    const statuses = ["to_do", "first_contact", "second_contact", "proposal_sent", "negotiation", "won", "lost"] as const;
    for (const status of statuses) {
      const result = opportunitySchema.safeParse({ ...validBase, status });
      expect(result.success, `statut '${status}' devrait être valide`).toBe(true);
    }
  });
});
