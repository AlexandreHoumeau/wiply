import { ContactVia, OpportunityFormValues, OpportunityStatus, opportunitySchema } from "@/lib/validators/oppotunities";

const DELIMITERS = [",", ";", "\t"] as const;

const HEADER_ALIASES: Record<string, keyof OpportunityFormValues> = {
  activity: "company_sector",
  address: "company_address",
  adresse: "company_address",
  businesssector: "company_sector",
  canal: "contact_via",
  channel: "contact_via",
  client: "company_name",
  company: "company_name",
  companyaddress: "company_address",
  companyemail: "company_email",
  companyname: "company_name",
  companyphone: "company_phone",
  companysector: "company_sector",
  companywebsite: "company_website",
  contact: "contact_via",
  contactemail: "company_email",
  deal: "name",
  dealname: "name",
  description: "description",
  email: "company_email",
  entreprise: "company_name",
  industry: "company_sector",
  mail: "company_email",
  mobile: "company_phone",
  name: "name",
  opportunity: "name",
  opportunityname: "name",
  organisation: "company_name",
  organization: "company_name",
  phone: "company_phone",
  project: "name",
  sector: "company_sector",
  site: "company_website",
  siteweb: "company_website",
  societe: "company_name",
  statut: "status",
  status: "status",
  telephone: "company_phone",
  tel: "company_phone",
  title: "name",
  url: "company_website",
  via: "contact_via",
  website: "company_website",
};

const STATUS_ALIASES: Record<string, OpportunityStatus> = {
  afaire: "to_do",
  gagné: "won",
  gagne: "won",
  inbound: "inbound",
  lost: "lost",
  negotiation: "negotiation",
  négociation: "negotiation",
  negociation: "negotiation",
  perdu: "lost",
  premiercontact: "first_contact",
  premiercontacte: "first_contact",
  proposalsent: "proposal_sent",
  propositionenvoyee: "proposal_sent",
  propositionenvoyée: "proposal_sent",
  secondcontact: "second_contact",
  todo: "to_do",
  won: "won",
};

const CONTACT_ALIASES: Record<string, ContactVia> = {
  email: "email",
  instagram: "instagram",
  irl: "IRL",
  linkedin: "linkedin",
  phone: "phone",
  telephone: "phone",
};

export type CsvImportPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  values: OpportunityFormValues;
  errors: string[];
  missingFields: string[];
};

export type CsvImportPreview = {
  headers: string[];
  rows: CsvImportPreviewRow[];
  validRows: OpportunityFormValues[];
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCell(value: string | undefined): string {
  return (value ?? "").trim();
}

function asOptionalString(value: string | undefined): string {
  return value ?? "";
}

function normalizeDuplicatePart(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseStatus(value: string): OpportunityStatus {
  const normalized = normalizeKey(value);
  return STATUS_ALIASES[normalized] ?? "to_do";
}

function parseContactVia(value: string, email: string, phone: string): ContactVia {
  const normalized = normalizeKey(value);
  if (CONTACT_ALIASES[normalized]) {
    return CONTACT_ALIASES[normalized];
  }
  if (email) {
    return "email";
  }
  if (phone) {
    return "phone";
  }
  return "linkedin";
}

function buildOpportunityName(companyName: string, website: string): string {
  if (!companyName) {
    return "";
  }

  if (website) {
    return `Refonte du site ${companyName}`;
  }

  return `Creation du site ${companyName}`;
}

export function getOpportunityImportMissingFields(values: OpportunityFormValues): string[] {
  const missingFields: string[] = [];
  const companyEmail = asOptionalString(values.company_email);
  const companyPhone = asOptionalString(values.company_phone);

  if (!values.company_name.trim()) {
    missingFields.push("Nom de l'entreprise");
  }

  if (!values.name.trim()) {
    missingFields.push("Titre de l'opportunité");
  }

  if (values.contact_via === "email" && !companyEmail.trim()) {
    missingFields.push("Email");
  }

  if (values.contact_via === "phone" && !companyPhone.trim()) {
    missingFields.push("Téléphone");
  }

  return missingFields;
}

export function getOpportunityImportCoreMissingFields(values: OpportunityFormValues): string[] {
  const missingFields: string[] = [];
  const companyEmail = asOptionalString(values.company_email);
  const companyPhone = asOptionalString(values.company_phone);

  if (!values.company_name.trim()) {
    missingFields.push("Nom de l'entreprise");
  }

  if (!companyEmail.trim() && !companyPhone.trim()) {
    missingFields.push("Email ou téléphone");
  }

  return missingFields;
}

export function hasOpportunityImportCoreData(values: OpportunityFormValues): boolean {
  return getOpportunityImportCoreMissingFields(values).length === 0;
}

export function buildOpportunityImportDuplicateKey(values: OpportunityFormValues): string | null {
  const company = normalizeDuplicatePart(values.company_name);
  const email = normalizeDuplicatePart(asOptionalString(values.company_email));
  const phone = normalizeDuplicatePart(asOptionalString(values.company_phone));
  const title = normalizeDuplicatePart(values.name);

  if (!company) {
    return null;
  }

  if (!email && !phone && !title) {
    return null;
  }

  return [company, email, phone, title].join("|");
}

export function getOpportunityImportDuplicateKeys(rows: OpportunityFormValues[]): Set<string> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = buildOpportunityImportDuplicateKey(row);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );
}

function toDisplayName(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getHostname(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const normalized = value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function stripCommonDomainParts(value: string): string {
  return value
    .replace(/^www\./, "")
    .replace(/\.(com|fr|io|co|net|org|app|dev|agency|studio|digital|eu|ai)$/i, "");
}

export function inferCompanyNameFromWebsiteOrEmail(website: string, email: string): string {
  const hostname = getHostname(website);
  if (hostname) {
    const candidate = stripCommonDomainParts(hostname).split(".")[0] ?? "";
    if (candidate) {
      return toDisplayName(candidate);
    }
  }

  const emailDomain = email.includes("@") ? email.split("@")[1] : "";
  if (emailDomain) {
    const candidate = stripCommonDomainParts(emailDomain).split(".")[0] ?? "";
    if (candidate) {
      return toDisplayName(candidate);
    }
  }

  return "";
}

export function applyOpportunityImportAutofill(values: OpportunityFormValues): OpportunityFormValues {
  const companyEmail = asOptionalString(values.company_email);
  const companyPhone = asOptionalString(values.company_phone);
  const companyWebsite = asOptionalString(values.company_website);
  const nextCompanyName = values.company_name.trim() || inferCompanyNameFromWebsiteOrEmail(companyWebsite, companyEmail);
  const nextContactVia =
    companyEmail.trim()
      ? "email"
      : companyPhone.trim()
        ? "phone"
        : values.contact_via;

  return {
    ...values,
    company_name: nextCompanyName,
    company_email: companyEmail,
    company_phone: companyPhone,
    company_website: companyWebsite,
    name: values.name.trim() || buildOpportunityName(nextCompanyName, companyWebsite),
    contact_via: nextContactVia,
  };
}

export function validateOpportunityImportRow(values: OpportunityFormValues) {
  const autofilledValues = applyOpportunityImportAutofill(values);
  const validation = opportunitySchema.safeParse(autofilledValues);

  return {
    values: validation.success ? validation.data : autofilledValues,
    errors: validation.success ? [] : validation.error.issues.map((issue) => issue.message),
    missingFields: getOpportunityImportMissingFields(autofilledValues),
  };
}

export function detectCsvDelimiter(text: string): "," | ";" | "\t" {
  const sample = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  let bestDelimiter: "," | ";" | "\t" = ",";
  let bestScore = -1;

  for (const delimiter of DELIMITERS) {
    const score = sample.split(delimiter).length;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const delimiter = detectCsvDelimiter(text);
  let currentCell = "";
  let currentRow: string[] = [];
  let insideQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

export function normalizeOpportunityCsvRows(text: string): CsvImportPreview {
  const matrix = parseCsvText(text);

  if (matrix.length === 0) {
    return { headers: [], rows: [], validRows: [] };
  }

  const headers = matrix[0];
  const mappedHeaders = headers.map((header) => HEADER_ALIASES[normalizeKey(header)] ?? null);
  const rows: CsvImportPreviewRow[] = matrix.slice(1).map((cells, index) => {
    const raw = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = normalizeCell(cells[headerIndex]);
      return acc;
    }, {});

    const companyName = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "company_name") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );
    const email = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "company_email") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );
    const phone = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "company_phone") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );
    const providedName = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "name") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );
    const providedStatus = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "status") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );
    const providedContactVia = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "contact_via") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );

    const website = normalizeCell(
      mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
        if (mappedHeader === "company_website") {
          return cells[headerIndex];
        }
        return value;
      }, undefined)
    );

    const candidate: OpportunityFormValues = {
      name: providedName || buildOpportunityName(companyName, website),
      description: normalizeCell(
        mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
          if (mappedHeader === "description") {
            return cells[headerIndex];
          }
          return value;
        }, undefined)
      ),
      company_name: companyName,
      company_email: email,
      company_phone: phone,
      company_website: website,
      company_address: normalizeCell(
        mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
          if (mappedHeader === "company_address") {
            return cells[headerIndex];
          }
          return value;
        }, undefined)
      ),
      company_sector: normalizeCell(
        mappedHeaders.reduce<string | undefined>((value, mappedHeader, headerIndex) => {
          if (mappedHeader === "company_sector") {
            return cells[headerIndex];
          }
          return value;
        }, undefined)
      ),
      company_links: [],
      status: parseStatus(providedStatus),
      contact_via: parseContactVia(providedContactVia, email, phone),
    };

    const validation = validateOpportunityImportRow(candidate);

    return {
      rowNumber: index + 2,
      raw,
      values: validation.values,
      errors: validation.errors,
      missingFields: validation.missingFields,
    };
  });

  return {
    headers,
    rows,
    validRows: rows.flatMap((row) => (row.errors.length === 0 ? [row.values] : [])),
  };
}
