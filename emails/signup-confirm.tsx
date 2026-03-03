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

interface SignupConfirmEmailProps {
    confirmLink: string;
    firstName: string;
}

export const SignupConfirmEmail = ({
    confirmLink,
    firstName,
}: SignupConfirmEmailProps) => (
    <Html>
        <Head />
        <Preview>Confirmez votre adresse email pour accéder à Wiply</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={logoContainer}>
                    <Text style={logoText}>Wiply</Text>
                </Section>
                <Heading style={h1}>Confirmez votre email</Heading>
                <Text style={text}>
                    Bonjour {firstName},
                </Text>
                <Text style={text}>
                    Merci de vous être inscrit sur Wiply. Cliquez sur le bouton ci-dessous pour activer votre compte et accéder à votre espace de travail.
                </Text>
                <Section style={buttonContainer}>
                    <Button style={button} href={confirmLink}>
                        Confirmer mon adresse email
                    </Button>
                </Section>
                <Text style={smallText}>
                    Ce lien est valable pendant 24 heures. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.
                </Text>
                <Hr style={hr} />
                <Text style={footer}>
                    © {new Date().getFullYear()} Wiply — Le CRM pensé pour l'efficacité.
                </Text>
            </Container>
        </Body>
    </Html>
);

// Styles
const main = {
    backgroundColor: "#f9fafb",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const container = {
    margin: "0 auto",
    padding: "40px 20px",
    width: "600px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb"
};

const logoContainer = {
    marginBottom: "32px"
};

const logoText = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#6366f1",
    margin: "0",
    letterSpacing: "-0.5px"
};

const h1 = {
    color: "#111827",
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "32px",
    margin: "0 0 20px"
};

const text = {
    color: "#4b5563",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px"
};

const smallText = {
    ...text,
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "24px"
};

const buttonContainer = {
    margin: "32px 0"
};

const button = {
    padding: "12px 30px",
    backgroundColor: "#6366f1",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block"
};

const hr = {
    borderColor: "#f3f4f6",
    margin: "32px 0 24px"
};

const footer = {
    color: "#9ca3af",
    fontSize: "12px",
    textAlign: "center" as const
};
