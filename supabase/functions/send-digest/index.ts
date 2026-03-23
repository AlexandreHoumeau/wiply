import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const APP_URL = Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://wiply.fr";
const SENDER = { name: "Wiply", email: "noreply@wiply.fr" };

// Notification types that map to user preference columns
const TYPE_TO_PREF: Record<string, string> = {
    task_assigned: "notify_task_assigned",
    task_comment: "notify_task_comment",
    task_mention: "notify_task_comment",
    opportunity_status_changed: "notify_opportunity_status",
    tracking_click: "notify_tracking_click",
    portal_submission: "notify_portal_submission",
};

const TYPE_META: Record<string, { label: string; emoji: string }> = {
    task_assigned: { label: "Tâche assignée", emoji: "📋" },
    task_comment: { label: "Commentaire", emoji: "💬" },
    task_mention: { label: "Mention", emoji: "🔔" },
    opportunity_status_changed: { label: "Opportunité", emoji: "📊" },
    tracking_click: { label: "Lien cliqué", emoji: "🔗" },
    portal_submission: { label: "Portail client", emoji: "📁" },
    member_joined: { label: "Nouveau membre", emoji: "👋" },
};

function resolveLink(type: string, metadata: Record<string, unknown>): string | null {
    switch (type) {
        case "member_joined":
            return `${APP_URL}/app/agency`;
        case "task_comment":
        case "task_assigned":
        case "task_mention": {
            const project_slug = metadata.project_slug as string | undefined;
            const task_prefix = metadata.task_prefix as string | undefined;
            const task_number = metadata.task_number as number | undefined;
            if (!project_slug || !task_prefix || task_number == null) return null;
            return `${APP_URL}/app/projects/${project_slug}/board?task=${task_prefix}-${task_number}`;
        }
        case "opportunity_status_changed": {
            const opportunity_slug = metadata.opportunity_slug as string | undefined;
            if (!opportunity_slug) return null;
            return `${APP_URL}/app/opportunities/${opportunity_slug}`;
        }
        case "portal_submission": {
            const project_slug = metadata.project_slug as string | undefined;
            if (!project_slug) return null;
            return `${APP_URL}/app/projects/${project_slug}/checklist`;
        }
        case "tracking_click": {
            const opportunity_slug = metadata.opportunity_slug as string | undefined;
            if (!opportunity_slug) return null;
            return `${APP_URL}/app/opportunities/${opportunity_slug}/tracking`;
        }
        default:
            return null;
    }
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function buildDigestHtml(firstName: string, notifications: Array<{ type: string; title: string; body: string | null; created_at: string; metadata: Record<string, unknown> }>): string {
    const count = notifications.length;
    const rows = notifications.slice(0, 10).map((n) => {
        const meta = TYPE_META[n.type] ?? { label: n.type, emoji: "•" };
        const link = resolveLink(n.type, n.metadata ?? {});
        const titleHtml = link
            ? `<a href="${link}" style="color:#6366f1;text-decoration:none;font-size:14px;font-weight:600">${n.title}</a>`
            : `<span style="color:#111827;font-size:14px;font-weight:600">${n.title}</span>`;
        const voirHtml = link
            ? ` <a href="${link}" style="color:#6366f1;font-size:11px;text-decoration:none">Voir →</a>`
            : "";
        return `
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px">${meta.emoji}</td>
          <td style="vertical-align:top;padding-bottom:12px">
            <div style="margin:0 0 2px">${titleHtml}</div>
            ${n.body ? `<div style="color:#6b7280;font-size:13px;margin:0 0 4px">${n.body}</div>` : ""}
            <div style="color:#9ca3af;font-size:11px">${meta.label} · ${formatDate(n.created_at)}${voirHtml}</div>
          </td>
        </tr>`;
    }).join("\n");

    const moreRow = count > 10
        ? `<tr><td colspan="2" style="color:#6b7280;font-size:13px;font-style:italic;text-align:center;padding:8px 0">+ ${count - 10} autres notifications</td></tr>`
        : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0">
  <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px 20px">
    <tr><td>
      <div style="font-size:24px;font-weight:800;color:#6366f1;letter-spacing:-0.5px;margin-bottom:32px">Wiply</div>
      <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 12px">Bonjour ${firstName},</h1>
      <p style="color:#4b5563;font-size:16px;margin:0 0 24px">
        Vous avez <strong>${count} nouvelle${count > 1 ? "s" : ""} notification${count > 1 ? "s" : ""}</strong> depuis la dernière heure.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        ${rows}
        ${moreRow}
      </table>
      <div style="margin:32px 0">
        <a href="${APP_URL}/app" style="padding:12px 30px;background:#6366f1;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block">
          Voir toutes les notifications
        </a>
      </div>
      <hr style="border-color:#f3f4f6;margin:32px 0 24px">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0 0 4px">
        Vous recevez cet email car vous avez activé les notifications email dans vos préférences.
        <a href="${APP_URL}/app/settings/profile" style="color:#6366f1">Gérer mes préférences</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
        © ${new Date().getFullYear()} Wiply — Le CRM pensé pour l'efficacité.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBrevoEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sender: SENDER,
            to: [{ email: to }],
            subject,
            htmlContent,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Brevo error ${res.status}: ${text}`);
    }
}

Deno.serve(async (_req) => {
    try {
        // Fetch un-emailed notifications older than 5 minutes
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: notifications, error } = await supabase
            .from("notifications")
            .select(`
                id,
                user_id,
                type,
                title,
                body,
                created_at,
                metadata,
                profile:profiles!notifications_user_id_fkey (
                    email,
                    first_name,
                    notify_task_assigned,
                    notify_task_comment,
                    notify_opportunity_status,
                    notify_tracking_click,
                    notify_portal_submission
                )
            `)
            .is("emailed_at", null)
            .lt("created_at", cutoff)
            .order("user_id")
            .order("created_at");

        if (error) throw error;
        if (!notifications?.length) {
            return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
        }

        // Group by user
        const byUser = new Map<string, typeof notifications>();
        for (const n of notifications) {
            const profile = n.profile as any;
            if (!profile?.email) continue;

            // Check if this notification type is opted in
            const prefKey = TYPE_TO_PREF[n.type];
            if (prefKey && !profile[prefKey]) continue;

            const group = byUser.get(n.user_id) ?? [];
            group.push(n);
            byUser.set(n.user_id, group);
        }

        const sentIds: string[] = [];
        let emailsSent = 0;

        for (const [, userNotifs] of byUser) {
            const profile = (userNotifs[0].profile as any);
            const firstName = profile.first_name ?? "là";
            const email = profile.email;
            const count = userNotifs.length;

            try {
                const html = buildDigestHtml(firstName, userNotifs);
                const subject = `Wiply — ${count} nouvelle${count > 1 ? "s" : ""} notification${count > 1 ? "s" : ""}`;
                await sendBrevoEmail(email, subject, html);
                emailsSent++;
                sentIds.push(...userNotifs.map((n: any) => n.id));
            } catch (err) {
                console.error(`Failed to send digest to ${email}:`, err);
            }
        }

        // Mark all successfully sent notifications as emailed
        if (sentIds.length > 0) {
            await supabase
                .from("notifications")
                .update({ emailed_at: new Date().toISOString() })
                .in("id", sentIds);
        }

        return new Response(JSON.stringify({ sent: emailsSent, notifications: sentIds.length }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("send-digest error:", err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
});
