import { describe, expect, it } from "vitest";

import {
  applyOpportunityImportAutofill,
  buildOpportunityImportDuplicateKey,
  getOpportunityImportDuplicateKeys,
  getOpportunityImportMissingFields,
  inferCompanyNameFromWebsiteOrEmail,
  normalizeOpportunityCsvRows,
  parseCsvText,
  validateOpportunityImportRow,
} from "@/lib/opportunities/csv";

describe("parseCsvText", () => {
  it("parses quoted cells and semicolon delimiters", () => {
    const csv = 'company;email;description\n"ACME, Paris";hello@acme.fr;"Refonte, tracking"';

    const rows = parseCsvText(csv);

    expect(rows).toEqual([
      ["company", "email", "description"],
      ["ACME, Paris", "hello@acme.fr", "Refonte, tracking"],
    ]);
  });
});

describe("normalizeOpportunityCsvRows", () => {
  it("maps common aliases and infers default values", () => {
    const csv = "Entreprise;Email;Telephone\nACME;hello@acme.fr;0612345678";

    const preview = normalizeOpportunityCsvRows(csv);

    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]).toMatchObject({
      company_name: "ACME",
      company_email: "hello@acme.fr",
      company_phone: "0612345678",
      name: "Creation du site ACME",
      status: "to_do",
      contact_via: "email",
    });
  });

  it("uses a refonte title when a website is present", () => {
    const csv = "company,website,email\nACME,https://acme.fr,hello@acme.fr";

    const preview = normalizeOpportunityCsvRows(csv);

    expect(preview.validRows[0]?.name).toBe("Refonte du site ACME");
  });

  it("keeps rows without email valid by inferring phone contact", () => {
    const csv = "company,phone\nACME,0612345678";

    const preview = normalizeOpportunityCsvRows(csv);

    expect(preview.rows[0].errors).toEqual([]);
    expect(preview.validRows[0]?.contact_via).toBe("phone");
  });

  it("reports invalid rows when required data is missing", () => {
    const csv = "company,email\n,notanemail";

    const preview = normalizeOpportunityCsvRows(csv);

    expect(preview.validRows).toHaveLength(0);
    expect(preview.rows[0].errors.length).toBeGreaterThan(0);
    expect(preview.rows[0].missingFields).toContain("Nom de l'entreprise");
  });
});

describe("validateOpportunityImportRow", () => {
  it("flags email as missing when contact_via is email", () => {
    const result = validateOpportunityImportRow({
      name: "Creation du site ACME",
      description: "",
      company_name: "ACME",
      company_email: "",
      company_phone: "",
      company_website: "",
      company_address: "",
      company_sector: "",
      company_links: [],
      status: "to_do",
      contact_via: "email",
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.missingFields).toContain("Email");
  });

  it("lists the company name as a missing field", () => {
    const missingFields = getOpportunityImportMissingFields({
      name: "",
      description: "",
      company_name: "",
      company_email: "",
      company_phone: "",
      company_website: "",
      company_address: "",
      company_sector: "",
      company_links: [],
      status: "to_do",
      contact_via: "linkedin",
    });

    expect(missingFields).toContain("Nom de l'entreprise");
    expect(missingFields).toContain("Titre de l'opportunité");
  });
});

describe("autofill helpers", () => {
  it("infers a company name from the website", () => {
    expect(inferCompanyNameFromWebsiteOrEmail("https://www.acme.fr", "")).toBe("Acme");
  });

  it("infers a company name from the email domain", () => {
    expect(inferCompanyNameFromWebsiteOrEmail("", "hello@beta-studio.io")).toBe("Beta Studio");
  });

  it("autofills company name, title and contact_via", () => {
    const result = applyOpportunityImportAutofill({
      name: "",
      description: "",
      company_name: "",
      company_email: "hello@acme.fr",
      company_phone: "",
      company_website: "https://acme.fr",
      company_address: "",
      company_sector: "",
      company_links: [],
      status: "to_do",
      contact_via: "linkedin",
    });

    expect(result.company_name).toBe("Acme");
    expect(result.name).toBe("Refonte du site Acme");
    expect(result.contact_via).toBe("email");
  });
});

describe("duplicate detection", () => {
  it("builds a duplicate key from company and contact data", () => {
    const key = buildOpportunityImportDuplicateKey({
      name: "Creation du site ACME",
      description: "",
      company_name: "ACME",
      company_email: "hello@acme.fr",
      company_phone: "",
      company_website: "",
      company_address: "",
      company_sector: "",
      company_links: [],
      status: "to_do",
      contact_via: "email",
    });

    expect(key).toContain("acme");
    expect(key).toContain("hello@acme.fr");
  });

  it("detects duplicate rows in a batch", () => {
    const duplicates = getOpportunityImportDuplicateKeys([
      {
        name: "Creation du site ACME",
        description: "",
        company_name: "ACME",
        company_email: "hello@acme.fr",
        company_phone: "",
        company_website: "",
        company_address: "",
        company_sector: "",
        company_links: [],
        status: "to_do",
        contact_via: "email",
      },
      {
        name: "Creation du site ACME",
        description: "",
        company_name: "ACME",
        company_email: "hello@acme.fr",
        company_phone: "",
        company_website: "",
        company_address: "",
        company_sector: "",
        company_links: [],
        status: "to_do",
        contact_via: "email",
      },
    ]);

    expect(duplicates.size).toBe(1);
  });
});
