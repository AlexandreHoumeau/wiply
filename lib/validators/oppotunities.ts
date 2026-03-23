import { z } from "zod";
import { Company, CompanyLink } from "./companies";

export const opportunitySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),

  company_name: z.string().min(1, "Le nom de l'entreprise est requis"),
  company_email: z.string().email("Email invalide").optional().or(z.literal("")),
  company_phone: z.string().optional(),
  company_website: z.string().url("URL invalide").optional().or(z.literal("")),
  company_address: z.string().optional(),
  company_sector: z.string().optional(),
  company_links: z.array(z.object({
    label: z.string().min(1),
    url: z.string().url("URL invalide"),
  })),

  status: z.enum([
    "inbound",
    "to_do",
    "first_contact",
    "second_contact",
    "proposal_sent",
    "negotiation",
    "won",
    "lost",
  ]),

  contact_via: z.enum(["email", "phone", "IRL", "instagram", "linkedin"]),
}).refine(
  (data) => {
    // If contact_via is email, company_email must be filled
    if (data.contact_via === "email") {
      return data.company_email && data.company_email.trim() !== "";
    }
    return true;
  },
  {
    message: "L'email de l'entreprise est requis lorsque la méthode de contact est 'Email'",
    path: ["company_email"],
  }
).refine(
  (data) => {
    // If contact_via is phone, company_phone must be filled
    if (data.contact_via === "phone") {
      return data.company_phone && data.company_phone.trim() !== "";
    }
    return true;
  },
  {
    message: "Le téléphone de l'entreprise est requis lorsque la méthode de contact est 'Téléphone'",
    path: ["company_phone"],
  }
);

export type OpportunityFormValues = z.infer<typeof opportunitySchema>;


export type OpportunityStatus =
  | "inbound"
  | "to_do"
  | "first_contact"
  | "second_contact"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export const mapOpportunityStatusLabel: Record<OpportunityStatus, string> = {
  inbound: "Entrant",
  to_do: "À faire",
  first_contact: "Premier contact",
  second_contact: "Deuxième contact",
  proposal_sent: "Proposition envoyée",
  negotiation: "Négociation",
  won: "Gagné",
  lost: "Perdu",
};

export const mapContactViaLabel: Record<ContactVia, string> = {
  email: "Email",
  phone: "Téléphone",
  IRL: "En personne",
  instagram: "Instagram",
  linkedin: "LinkedIn"
};

export type ContactVia = "email" | "phone" | "IRL" | "instagram" | "linkedin";


export type Opportunity = {
  id: string;
  agency_id: string | null;
  company_id: string | null;

  name: string;
  description: string | null;

  status: OpportunityStatus;
  contact_via: ContactVia | null;

  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  slug: string;
};

export type OpportunityWithCompany = Opportunity & {
  company: Company | null;
};


export const mapOpportunityWithCompanyToFormValues = (opportunity: OpportunityWithCompany): OpportunityFormValues => ({
  name: opportunity.name,
  description: opportunity.description || "",
  company_name: opportunity?.company?.name ?? "",
  company_email: opportunity?.company?.email || "",
  company_phone: opportunity?.company?.phone_number || "",
  company_website: opportunity?.company?.website || "",
  company_address: opportunity?.company?.address || "",
  company_sector: opportunity?.company?.business_sector || "",
  company_links: opportunity?.company?.links ?? [],
  status: opportunity.status,
  contact_via: opportunity.contact_via!,
});


export const ALL_STATUSES: OpportunityStatus[] = [
  "inbound",
  "to_do",
  "first_contact",
  "second_contact",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const ALL_CONTACT_VIA: ContactVia[] = [
  "email",
  "phone",
  "IRL",
  "instagram",
  "linkedin",
];

// --- Timeline ---

export type TimelineEventType =
  | "created"
  | "status_changed"
  | "info_updated"
  | "note_added"
  | "ai_message_generated"
  | "tracking_link_created";

export type OpportunityEvent = {
  id: string;
  opportunity_id: string;
  user_id: string | null;
  event_type: TimelineEventType;
  metadata: Record<string, any>;
  created_at: string;
  user: { first_name: string; last_name: string } | null;
};