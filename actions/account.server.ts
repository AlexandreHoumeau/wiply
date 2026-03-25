'use server'

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"
import { sendEmail } from "@/lib/email"
import { AccountDeletionEmail } from "@/emails/account-deletion-confirmation"
import React from "react"
import { redirect } from "next/navigation"

// ─── deleteAccount ──────────────────────────────────────────────────────────

export async function deleteAccount(
    confirmationEmail: string
): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, message: "Non authentifié" }
    }

    // Validate email confirmation
    if (confirmationEmail.toLowerCase().trim() !== user.email?.toLowerCase()) {
        return { success: false, message: "L'adresse email ne correspond pas à votre compte." }
    }

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, agency_id, role")
        .eq("id", user.id)
        .single()

    if (!profile) {
        // No profile — just delete auth user
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        return { success: true, message: "Compte supprimé." }
    }

    const agencyId = profile.agency_id

    if (!agencyId) {
        // Orphaned member — delete profile + auth user
        await deleteUserData(user.id)
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        return { success: true, message: "Compte supprimé." }
    }

    const { data: agency } = await supabaseAdmin
        .from("agencies")
        .select("id, owner_id, plan, stripe_customer_id, logo_url")
        .eq("id", agencyId)
        .single()

    if (!agency) {
        await deleteUserData(user.id)
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        return { success: true, message: "Compte supprimé." }
    }

    const isOwner = agency.owner_id === user.id

    if (!isOwner) {
        // Case 1: Regular member — remove from agency and delete account
        await deleteUserData(user.id)
        await supabaseAdmin.auth.admin.deleteUser(user.id)
    } else {
        // Find other admins in the agency
        const { data: otherAdmins } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("agency_id", agencyId)
            .eq("role", "agency_admin")
            .neq("id", user.id)
            .order("id")
            .limit(1)

        if (otherAdmins && otherAdmins.length > 0) {
            // Case 2: Transfer ownership to another admin
            const newOwnerId = otherAdmins[0].id
            await supabaseAdmin
                .from("agencies")
                .update({ owner_id: newOwnerId })
                .eq("id", agencyId)

            await deleteUserData(user.id)
            await supabaseAdmin.auth.admin.deleteUser(user.id)
        } else {
            // Case 3: Sole owner — delete entire agency
            await cancelStripeSubscription(agency)
            await deleteAgencyData(agencyId)
            await supabaseAdmin.auth.admin.deleteUser(user.id)
        }
    }

    try {
        await sendEmail({
            to: user.email!,
            subject: "Votre compte Wiply a été supprimé",
            template: React.createElement(AccountDeletionEmail, { firstName: (profile as any).first_name }),
        })
    } catch {
        // Don't block deletion if email fails
    }

    return { success: true, message: "Votre compte a été supprimé avec succès." }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Deletes all personal data tied to a single user
 * (their notifications, comments, events) and their profile.
 * Does NOT delete the agency.
 */
async function deleteUserData(userId: string): Promise<void> {
    // Nullify assignee on tasks
    await supabaseAdmin
        .from("tasks")
        .update({ assignee_id: null })
        .eq("assignee_id", userId)

    // Delete task comments authored by this user
    await supabaseAdmin
        .from("task_comments")
        .delete()
        .eq("user_id", userId)

    // Anonymize opportunity events authored by this user
    await supabaseAdmin
        .from("opportunity_events")
        .update({ user_id: null })
        .eq("user_id", userId)

    // Delete invites sent by this user
    await supabaseAdmin
        .from("agency_invites")
        .delete()
        .eq("invited_by", userId)

    // Delete notifications for this user
    await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", userId)

    // Delete the profile
    await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId)
}

/**
 * Deletes all data belonging to an agency (cascade, in dependency order).
 * Mirrors the cleanup logic in e2e/helpers/test-users.ts.
 */
async function deleteAgencyData(agencyId: string): Promise<void> {
    // Break circular FK: agencies.owner_id → profiles.id
    await supabaseAdmin
        .from("agencies")
        .update({ owner_id: null })
        .eq("id", agencyId)

    // Delete notifications
    await supabaseAdmin.from("notifications").delete().eq("agency_id", agencyId)

    // Delete AI messages
    await supabaseAdmin.from("ai_generated_messages").delete().eq("agency_id", agencyId)

    // Delete tracking clicks via tracking links
    const { data: trackingLinks } = await supabaseAdmin
        .from("tracking_links")
        .select("id")
        .eq("agency_id", agencyId)
    if (trackingLinks && trackingLinks.length > 0) {
        const ids = trackingLinks.map((l: { id: string }) => l.id)
        await supabaseAdmin.from("tracking_clicks").delete().in("tracking_link_id", ids)
    }
    await supabaseAdmin.from("tracking_links").delete().eq("agency_id", agencyId)

    // Delete AI configs and invites
    await supabaseAdmin.from("agency_ai_configs").delete().eq("agency_id", agencyId)
    await supabaseAdmin.from("agency_invites").delete().eq("agency_id", agencyId)

    // Delete invites sent BY members of this agency
    const { data: agencyProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("agency_id", agencyId)
    if (agencyProfiles && agencyProfiles.length > 0) {
        const profileIds = agencyProfiles.map((p: { id: string }) => p.id)
        await supabaseAdmin.from("agency_invites").delete().in("invited_by", profileIds)

        // Anonymize opportunity events authored by members
        await supabaseAdmin
            .from("opportunity_events")
            .update({ user_id: null })
            .in("user_id", profileIds)
    }

    // ─── Files cleanup ──────────────────────────────────────────────────────────
    // 1. Fetch storage paths BEFORE deleting rows
    const { data: agencyFiles } = await supabaseAdmin
        .from("files")
        .select("id, storage_path")
        .eq("agency_id", agencyId)
        .eq("type", "upload")

    // 2. Delete files rows (cascades task_files via file_id FK)
    await supabaseAdmin.from("files").delete().eq("agency_id", agencyId)

    // 3. Delete Storage objects after DB commit
    if (agencyFiles && agencyFiles.length > 0) {
        const storagePaths = agencyFiles
            .map((f: { storage_path: string | null }) => f.storage_path)
            .filter(Boolean) as string[]
        if (storagePaths.length > 0) {
            await supabaseAdmin.storage.from("agency-files").remove(storagePaths)
        }
    }
    // ────────────────────────────────────────────────────────────────────────────

    // Delete tasks (task_comments have FK → tasks, no cascade, delete first)
    const { data: tasks } = await supabaseAdmin
        .from("tasks")
        .select("id")
        .eq("agency_id", agencyId)
    if (tasks && tasks.length > 0) {
        const taskIds = tasks.map((t: { id: string }) => t.id)
        await supabaseAdmin.from("task_comments").delete().in("task_id", taskIds)
    }
    await supabaseAdmin.from("tasks").delete().eq("agency_id", agencyId)

    // Delete project checklists (portal_uploads may cascade from project_checklists)
    const { data: projects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("agency_id", agencyId)
    if (projects && projects.length > 0) {
        const projectIds = projects.map((p: { id: string }) => p.id)
        const { data: checklists } = await supabaseAdmin
            .from("project_checklists")
            .select("id")
            .in("project_id", projectIds)
        if (checklists && checklists.length > 0) {
            const checklistIds = checklists.map((c: { id: string }) => c.id)
            await supabaseAdmin.from("portal_uploads").delete().in("checklist_item_id", checklistIds)
        }
        await supabaseAdmin.from("project_checklists").delete().in("project_id", projectIds)
    }
    await supabaseAdmin.from("projects").delete().eq("agency_id", agencyId)

    // Delete opportunities and companies
    await supabaseAdmin.from("opportunities").delete().eq("agency_id", agencyId)
    await supabaseAdmin.from("companies").delete().eq("agency_id", agencyId)

    // Delete agency logo from Storage
    const { data: agency } = await supabaseAdmin
        .from("agencies")
        .select("logo_url")
        .eq("id", agencyId)
        .single()
    if (agency?.logo_url) {
        try {
            const url = new URL(agency.logo_url)
            const pathParts = url.pathname.split("/agency-branding/")
            if (pathParts[1]) {
                await supabaseAdmin.storage.from("agency-branding").remove([pathParts[1]])
            }
        } catch {
            // Non-blocking
        }
    }

    // Delete all profiles in the agency
    await supabaseAdmin.from("profiles").delete().eq("agency_id", agencyId)

    // Delete the agency
    await supabaseAdmin.from("agencies").delete().eq("id", agencyId)
}

/**
 * Cancels the active Stripe subscription for an agency (if any).
 */
async function cancelStripeSubscription(agency: {
    stripe_customer_id: string | null
    plan: string | null
}): Promise<void> {
    if (!agency.stripe_customer_id || agency.plan !== "PRO") return
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: agency.stripe_customer_id,
            status: "active",
            limit: 1,
        })
        if (subscriptions.data.length > 0) {
            await stripe.subscriptions.cancel(subscriptions.data[0].id)
        }
    } catch {
        // Non-blocking — don't prevent account deletion if Stripe call fails
    }
}

// ─── exportAccountData ───────────────────────────────────────────────────────

export async function exportAccountData(): Promise<{ success: boolean; data?: object; message?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, message: "Non authentifié" }
    }

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, email, phone, role, created_at")
        .eq("id", user.id)
        .single()

    if (!profile) {
        return { success: false, message: "Profil introuvable" }
    }

    const agencyId = (profile as any).agency_id

    // Fetch all data in parallel
    const [
        agencyResult,
        projectsResult,
        tasksCreatedResult,
        tasksAssignedResult,
        opportunitiesResult,
        companiesResult,
        notificationsResult,
    ] = await Promise.all([
        agencyId
            ? supabaseAdmin
                .from("agencies")
                .select("name, slug, email, website, phone, address, created_at")
                .eq("id", agencyId)
                .single()
            : Promise.resolve({ data: null }),
        agencyId
            ? supabaseAdmin
                .from("projects")
                .select("name, description, status, start_date, created_at")
                .eq("agency_id", agencyId)
            : Promise.resolve({ data: [] }),
        supabaseAdmin
            .from("tasks")
            .select("title, description, status, type, priority, due_date, created_at")
            .eq("created_by", user.id),
        supabaseAdmin
            .from("tasks")
            .select("title, description, status, type, priority, due_date, created_at")
            .eq("assignee_id", user.id),
        agencyId
            ? supabaseAdmin
                .from("opportunities")
                .select("name, description, status, created_at, updated_at")
                .eq("agency_id", agencyId)
            : Promise.resolve({ data: [] }),
        agencyId
            ? supabaseAdmin
                .from("companies")
                .select("name, email, phone_number, website, business_sector, created_at")
                .eq("agency_id", agencyId)
            : Promise.resolve({ data: [] }),
        supabaseAdmin
            .from("notifications")
            .select("type, title, body, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(500),
    ])

    const exportData = {
        exported_at: new Date().toISOString(),
        profile: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: (profile as any).phone,
            role: profile.role,
            created_at: profile.created_at,
        },
        agency: agencyResult.data ?? null,
        projects: projectsResult.data ?? [],
        tasks: {
            created_by_me: tasksCreatedResult.data ?? [],
            assigned_to_me: tasksAssignedResult.data ?? [],
        },
        opportunities: opportunitiesResult.data ?? [],
        companies: companiesResult.data ?? [],
        notifications: notificationsResult.data ?? [],
    }

    return { success: true, data: exportData }
}
