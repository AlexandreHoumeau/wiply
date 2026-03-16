"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";
import { NewsletterWelcomeEmail } from "@/emails/newsletter-welcome";
import { z } from "zod";
import React from "react";

const emailSchema = z.string().email("Adresse email invalide");

export async function subscribeToNewsletter(
    email: string
): Promise<{ success: true } | { error: string }> {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
        return { error: "Adresse email invalide." };
    }

    const { error } = await supabaseAdmin
        .from("newsletter_subscribers")
        .insert({ email: parsed.data });

    if (error) {
        if (error.code === "23505") {
            return { error: "Vous êtes déjà inscrit !" };
        }
        return { error: "Une erreur est survenue. Réessayez." };
    }

    try {
        await sendEmail({
            to: parsed.data,
            subject: "Bienvenue dans la communauté Wiply",
            template: React.createElement(NewsletterWelcomeEmail),
        });
    } catch {
        // Don't block success if email fails
    }

    const posthog = getPostHogClient();
    posthog?.capture({
        distinctId: parsed.data,
        event: "newsletter_signup",
        properties: { email: parsed.data },
    });
    await posthog?.shutdown();

    return { success: true };
}
