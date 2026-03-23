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
} from "@react-email/components";
import * as React from "react";

interface MemberJoinedEmailProps {
    memberName: string;
    memberEmail: string;
    agencyName: string;
    appUrl: string;
}

export const MemberJoinedEmail = ({
    memberName,
    memberEmail,
    agencyName,
    appUrl,
}: MemberJoinedEmailProps) => (
    <Html>
        <Head />
        <Preview>{memberName} a rejoint {agencyName}</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={logoContainer}>
                    <Text style={logoText}>Wiply</Text>
                </Section>
                <Heading style={h1}>Nouveau membre</Heading>
                <Text style={text}>
                    <strong>{memberName}</strong> ({memberEmail}) a accepté son invitation et a rejoint l'espace de l'agence <strong>{agencyName}</strong>.
                </Text>
                <Section style={buttonContainer}>
                    <Button style={button} href={`${appUrl}/app/agency/settings`}>
                        Voir l'équipe
                    </Button>
                </Section>
                <Hr style={hr} />
                <Text style={footer}>
                    © {new Date().getFullYear()} Wiply — Le CRM pensé pour l'efficacité.
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
const logoContainer = { marginBottom: "32px" };
const logoText = { fontSize: "24px", fontWeight: "800", color: "#6366f1", margin: "0", letterSpacing: "-0.5px" };
const h1 = { color: "#111827", fontSize: "24px", fontWeight: "700", lineHeight: "32px", margin: "0 0 20px" };
const text = { color: "#4b5563", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px" };
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
const footer = { color: "#9ca3af", fontSize: "12px", textAlign: "center" as const };
