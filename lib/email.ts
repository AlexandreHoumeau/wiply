import { BrevoClient } from "@getbrevo/brevo";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

const SENDER = { name: "Wiply", email: "noreply@wiply.fr" };

function getBrevoClient() {
    return new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });
}

export async function sendEmail({
    to,
    subject,
    template,
}: {
    to: string;
    subject: string;
    template: ReactElement;
}): Promise<void> {
    const htmlContent = await render(template);
    await getBrevoClient().transactionalEmails.sendTransacEmail({
        sender: SENDER,
        to: [{ email: to }],
        subject,
        htmlContent,
    });
}
