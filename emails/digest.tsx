import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Row,
    Column,
} from "@react-email/components";
import * as React from "react";

export type DigestNotification = {
    type: string;
    title: string;
    body: string | null;
    created_at: string;
};

interface DigestEmailProps {
    firstName: string;
    notifications: DigestNotification[];
    appUrl: string;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
    task_assigned: { label: "Tâche assignée", emoji: "📋" },
    task_comment: { label: "Commentaire", emoji: "💬" },
    opportunity_status: { label: "Opportunité", emoji: "📊" },
    tracking_click: { label: "Lien cliqué", emoji: "🔗" },
    portal_submission: { label: "Portail client", emoji: "📁" },
    member_joined: { label: "Nouveau membre", emoji: "👋" },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const DigestEmail = ({ firstName, notifications, appUrl }: DigestEmailProps) => {
    const count = notifications.length;
    return (
        <Html>
            <Head />
            <Preview>
                {`${count} nouvelle${count > 1 ? "s" : ""} notification${count > 1 ? "s" : ""} sur Wiply`}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={logoContainer}>
                        <Text style={logoText}>Wiply</Text>
                    </Section>
                    <Heading style={h1}>Bonjour {firstName},</Heading>
                    <Text style={intro}>
                        Vous avez <strong>{count} nouvelle{count > 1 ? "s" : ""} notification{count > 1 ? "s" : ""}</strong> depuis la dernière heure.
                    </Text>

                    <Section style={notifList}>
                        {notifications.slice(0, 10).map((n, i) => {
                            const meta = TYPE_LABELS[n.type] ?? { label: n.type, emoji: "•" };
                            return (
                                <Row key={i} style={notifRow}>
                                    <Column style={emojiCol}>{meta.emoji}</Column>
                                    <Column style={contentCol}>
                                        <Text style={notifTitle}>{n.title}</Text>
                                        {n.body && <Text style={notifBody}>{n.body}</Text>}
                                        <Text style={notifMeta}>{meta.label} · {formatDate(n.created_at)}</Text>
                                    </Column>
                                </Row>
                            );
                        })}
                        {count > 10 && (
                            <Text style={moreText}>+ {count - 10} autres notifications</Text>
                        )}
                    </Section>

                    <Section style={buttonContainer}>
                        <Button style={button} href={appUrl}>
                            Voir toutes les notifications
                        </Button>
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        Vous recevez cet email car vous avez activé les notifications email dans vos préférences.{" "}
                        <a href={`${appUrl}/app/settings/profile`} style={footerLink}>Gérer mes préférences</a>
                    </Text>
                    <Text style={footer}>
                        © {new Date().getFullYear()} Wiply — Le CRM pensé pour l'efficacité.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

const main = {
    backgroundColor: "#f9fafb",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = {
    margin: "0 auto",
    padding: "40px 20px",
    width: "600px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
};
const logoContainer = { marginBottom: "32px" };
const logoText = { fontSize: "24px", fontWeight: "800", color: "#6366f1", margin: "0", letterSpacing: "-0.5px" };
const h1 = { color: "#111827", fontSize: "24px", fontWeight: "700", lineHeight: "32px", margin: "0 0 12px" };
const intro = { color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" };
const notifList = { marginBottom: "24px" };
const notifRow = {
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: "12px",
    marginBottom: "12px",
};
const emojiCol = { width: "36px", verticalAlign: "top" as const, paddingTop: "2px", fontSize: "20px" };
const contentCol = { verticalAlign: "top" as const };
const notifTitle = { color: "#111827", fontSize: "14px", fontWeight: "600", margin: "0 0 2px" };
const notifBody = { color: "#6b7280", fontSize: "13px", margin: "0 0 4px" };
const notifMeta = { color: "#9ca3af", fontSize: "11px", margin: "0" };
const moreText = { color: "#6b7280", fontSize: "13px", fontStyle: "italic" as const, textAlign: "center" as const };
const buttonContainer = { margin: "32px 0" };
const button = {
    padding: "12px 30px",
    backgroundColor: "#6366f1",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
};
const hr = { borderColor: "#f3f4f6", margin: "32px 0 24px" };
const footer = { color: "#9ca3af", fontSize: "12px", textAlign: "center" as const, margin: "0 0 4px" };
const footerLink = { color: "#6366f1" };
