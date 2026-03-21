import { z } from "zod"

/* ============================================================
   Base Schemas
============================================================ */

export const agencyNameSchema = z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")

export const agencyIdSchema = z
    .string()
    .uuid("Identifiant d'agence invalide")

export const emailSchema = z
    .string()
    .email("Email invalide")
    .toLowerCase()
    .optional()

export const websiteSchema = z
    .string()
    .url("URL invalide")
    .or(z.literal("")) // Allow empty string for optional websites
    .optional()

export const phoneSchema = z
    .string()
    .regex(
        /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/,
        "Numéro de téléphone invalide"
    )
    .or(z.literal(""))
    .optional()

export const addressSchema = z
    .string()
    .min(5, "L'adresse doit contenir au moins 5 caractères")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères")
    .optional()

export const legalFormSchema = z.enum([
  'SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'Auto-entrepreneur', 'Autre'
])


/* ============================================================
   Create Agency
============================================================ */

export const createAgencySchema = z.object({
    name: agencyNameSchema,
})

export type CreateAgencyInput = z.infer<typeof createAgencySchema>

export type CreateAgencyState = {
    success: boolean
    message?: string
    errors?: {
        name?: string[]
    }
}

/* ============================================================
   Update Agency
============================================================ */

export const updateAgencySchema = z.object({
    agency_id: agencyIdSchema,
    name: agencyNameSchema,
    website: websiteSchema,
    phone: phoneSchema,
    address: addressSchema,
    email: emailSchema,
    // New legal fields
    legal_name: z.string().max(200).optional(),
    legal_form: legalFormSchema.optional(),
    rcs_number: z.string().max(100).optional(),
    vat_number: z.string().regex(/^FR\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, "Format invalide (ex: FR12 345 678 901)").optional().or(z.literal('')),
})

export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>

export type UpdateAgencyState = {
    success: boolean
    message?: string
    errors?: {
        agency_id?: string[]
        name?: string[]
        vat_number?: string[]
    }
}

/* ============================================================
   Invite Member
============================================================ */

export const inviteAgencyMemberSchema = z.object({
    email: emailSchema,
    role: z.enum(["agency_admin", "agency_member"], {
        error: () => ({ message: "Rôle invalide" }),
    }),
})

export type InviteAgencyMemberInput = z.infer<typeof inviteAgencyMemberSchema>

export type InviteAgencyMemberState = {
    success: boolean
    message?: string
    errors?: {
        agency_id?: string[]
        email?: string[]
        role?: string[]
    }
}

/* ============================================================
   Update Member Role
============================================================ */

export const updateAgencyMemberRoleSchema = z.object({
    profile_id: z.string().uuid("Identifiant utilisateur invalide"),
    agency_id: agencyIdSchema,
    role: z.enum(["agency_admin", "agency_member"]),
})

export type UpdateAgencyMemberRoleInput =
    z.infer<typeof updateAgencyMemberRoleSchema>

export type UpdateAgencyMemberRoleState = {
    success: boolean
    message?: string
    errors?: {
        profile_id?: string[]
        agency_id?: string[]
        role?: string[]
    }
}

/* ============================================================
   Remove Member
============================================================ */

export const removeAgencyMemberSchema = z.object({
    profile_id: z.string().uuid("Identifiant utilisateur invalide"),
    agency_id: agencyIdSchema,
})

export type RemoveAgencyMemberInput =
    z.infer<typeof removeAgencyMemberSchema>

export type RemoveAgencyMemberState = {
    success: boolean
    message?: string
    errors?: {
        profile_id?: string[]
        agency_id?: string[]
    }
}


export type Agency = {
    id: string;
    name: string;
    created_at: string | null;
    slug: string;
    owner_id: string;
    is_active: boolean;
    website: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    logo_url: string | null;
    demo_ends_at: string | null;
    plan: string | null;
    // Legal fields
    legal_name: string | null;
    legal_form: string | null;
    rcs_number: string | null;
    vat_number: string | null;
}

/** Returns true if the agency has an effective PRO plan (paid or active demo) */
export function isProPlan(agency: Pick<Agency, 'plan' | 'demo_ends_at'>): boolean {
    if (agency.demo_ends_at && new Date(agency.demo_ends_at) > new Date()) return true
    return agency.plan === 'PRO'
}