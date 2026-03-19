import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface AccountDeletionEmailProps {
    firstName?: string;
}

export const AccountDeletionEmail = ({ firstName }: AccountDeletionEmailProps) => (
    <Html>
        <Head />
        <Preview>Votre compte Wiply a été supprimé</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={logoContainer}>
                    <Text style={logoText}>Wiply</Text>
                </Section>
                <Heading style={h1}>Votre compte a été supprimé</Heading>
                <Text style={text}>
                    {firstName ? `Bonjour ${firstName},` : "Bonjour,"}
                </Text>
                <Text style={text}>
                    Nous confirmons que votre compte Wiply ainsi que toutes vos données personnelles ont été définitivement supprimés, conformément au Règlement Général sur la Protection des Données (RGPD).
                </Text>
                <Text style={text}>
                    Les données suivantes ont été effacées :
                </Text>
                <Text style={listText}>• Votre profil et vos informations personnelles</Text>
                <Text style={listText}>• Votre historique de notifications</Text>
                <Text style={listText}>• Vos commentaires et activités</Text>
                <Text style={listText}>• Les données de votre agence (si vous en étiez le seul responsable)</Text>
                <Text style={smallText}>
                    Si vous n'êtes pas à l'origine de cette demande ou si vous pensez qu'il s'agit d'une erreur, contactez-nous immédiatement à support@wiply.fr.
                </Text>
                <Hr style={hr} />
                <Text style={footer}>
                    © {new Date().getFullYear()} Wiply — Cet email a été envoyé suite à la suppression de votre compte.
                </Text>
            </Container>
        </Body>
    </Html>
);

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

const logoContainer = {
    marginBottom: "32px",
};

const logoText = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#6366f1",
    margin: "0",
    letterSpacing: "-0.5px",
};

const h1 = {
    color: "#111827",
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "32px",
    margin: "0 0 20px",
};

const text = {
    color: "#4b5563",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 12px",
};

const listText = {
    color: "#4b5563",
    fontSize: "15px",
    lineHeight: "22px",
    margin: "0 0 4px",
    paddingLeft: "8px",
};

const smallText = {
    ...text,
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "24px",
};

const hr = {
    borderColor: "#f3f4f6",
    margin: "32px 0 24px",
};

const footer = {
    color: "#9ca3af",
    fontSize: "12px",
    textAlign: "center" as const,
};
