import * as z from "zod";

// ─── Form schema (client-side) ─────────────────────────────────────────────

export const newProjectSchema = z.object({
  name: z.string().min(2, "Le nom du projet est requis"),
  isNewCompany: z.boolean(),
  companyId: z.string().optional(),
  newCompanyData: z.object({
    name: z.string().optional(),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phone_number: z.string().optional(),
    website: z.string().optional(),
    business_sector: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.isNewCompany && (!data.newCompanyData || !data.newCompanyData.name)) {
    ctx.addIssue({
      path: ["newCompanyData", "name"],
      message: "Le nom de l'entreprise est requis",
      code: z.ZodIssueCode.custom,
    });
  }
});

export type NewProjectFormValues = z.infer<typeof newProjectSchema>;

// ─── Server action parameter types ────────────────────────────────────────

export interface OpportunityForProject {
  id: string;
  agency_id: string;
  company_id: string | null;
  description?: string | null;
  status: string;
}

export interface ProjectFromOpportunityData {
  name: string;
  start_date?: string;
  figma_url?: string;
  github_url?: string;
}

export interface TaskData {
  title: string;
  description?: string | null;
  status?: string;
  type?: string;
  priority?: string;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface ProjectSettingsData {
  name?: string;
  description?: string | null;
  start_date?: string | null;
  figma_url?: string | null;
  github_url?: string | null;
  deployment_url?: string | null;
  portal_message?: string | null;
  portal_show_progress?: boolean;
}

export interface ChecklistItemData {
  title: string;
  description?: string;
  expected_type: string;
}

// ─── Shared server action return type ─────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
