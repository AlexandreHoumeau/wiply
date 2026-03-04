'use server';

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BrevoClient } from "@getbrevo/brevo";
import { render } from "@react-email/components";
import { SignupConfirmEmail } from "@/emails/signup-confirm";
import { ResetPasswordEmail } from "@/emails/reset-password";

function getBrevoClient() {
    return new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });
}

type SignupInput = {
    email: string;
    password: string;
    agencyName?: string;
    firstName: string;
    lastName: string;
    redirectTo?: string;
};

export async function signup(data: SignupInput) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUrl = data.redirectTo
        ? `${baseUrl}/auth/callback?next=${encodeURIComponent(data.redirectTo)}`
        : `${baseUrl}/auth/callback`;

    // generateLink creates the user and returns the confirmation link
    // without Supabase auto-sending any email — we send it via Brevo instead
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: data.email,
        password: data.password,
        options: {
            redirectTo: redirectUrl,
            data: {
                ...(data.agencyName && { agency_name: data.agencyName }),
                first_name: data.firstName,
                last_name: data.lastName,
            },
        },
    });

    if (error) return { error: error.message };

    // Use hashed_token to build a link to our own /auth/confirm page instead of
    // Supabase's /auth/v1/verify URL. Email scanners (Gmail, etc.) pre-fetch
    // links in emails — hitting the Supabase URL directly would consume the OTP
    // before the user clicks. Our /auth/confirm page just renders a button;
    // scanners can't click it, so the OTP is preserved for the real user.
    const hashedToken = linkData.properties.hashed_token;
    const confirmLink = `${baseUrl}/auth/confirm?token_hash=${hashedToken}&type=signup`
        + (data.redirectTo ? `&next=${encodeURIComponent(data.redirectTo)}` : '');

    const htmlContent = await render(SignupConfirmEmail({
        confirmLink,
        firstName: data.firstName,
    }));

    try {
        await getBrevoClient().transactionalEmails.sendTransacEmail({
            sender: { name: 'Wiply', email: 'noreply@wiply.fr' },
            to: [{ email: data.email }],
            subject: 'Confirmez votre adresse email — Wiply',
            htmlContent,
        });
    } catch (emailError) {
        console.error("Brevo signup email error:", emailError);
        // User was created — don't block signup, they can request a new confirmation link
    }

    return { success: true };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
            redirectTo: `${baseUrl}/auth/callback?next=/auth/reset-password`,
        },
    });

    if (error) return { error: error.message };

    const htmlContent = await render(ResetPasswordEmail({
        resetLink: linkData.properties.action_link,
    }));

    try {
        await getBrevoClient().transactionalEmails.sendTransacEmail({
            sender: { name: 'Wiply', email: 'noreply@wiply.fr' },
            to: [{ email }],
            subject: 'Réinitialisez votre mot de passe — Wiply',
            htmlContent,
        });
    } catch (emailError) {
        console.error("Brevo reset password email error:", emailError);
    }

    return { success: true };
}

export async function updatePassword(newPassword: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { success: true };
}
