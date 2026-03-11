import { z } from "zod"

export type Profile = {
    id: string
    agency_id: string
    created_at: string
    first_name: string
    last_name: string
    phone: string
    email: string
    role: "agency_admin" | "agency_member" | "client"
    notify_task_assigned: boolean
    notify_task_comment: boolean
    notify_opportunity_status: boolean
    notify_tracking_click: boolean
    notify_portal_submission: boolean
}

export type NotificationPreferences = Pick<
    Profile,
    | 'notify_task_assigned'
    | 'notify_task_comment'
    | 'notify_opportunity_status'
    | 'notify_tracking_click'
    | 'notify_portal_submission'
>

export const updateProfileSchema = z.object({
    first_name: z.string().min(1, "Le prénom est requis").max(100),
    last_name: z.string().min(1, "Le nom est requis").max(100),
    phone: z.string().regex(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/, "Numéro de téléphone invalide").or(z.literal('')) /* z.string().regex(/^\+?[1-9]\d{1,14}$/, "Numéro de téléphone invalide").or(z.literal(null)), */
    // phone: z.string().optional(), --- IGNORE ---
})

export type UpdateProfileState = {
    success?: boolean
    message?: string
    errors?: {
        first_name?: string[]
        last_name?: string[]
        phone?: string[]
    }
}

export const mapRoleToPosition = (role: string) => {
    switch (role) {
        case "agency_admin":
            return "Administrateur"
        case "agency_member":
            return "Membre de l'agence"
        case "client":
            return "Client"
        default:
            return role
    }
}