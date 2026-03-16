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

export const NewsletterWelcomeEmail = () => (
    <Html>
        <Head />
        <Preview>Bienvenue dans la communauté Wiply</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={logoContainer}>
                    <Text style={logoText}>Wiply</Text>
                </Section>
                <Heading style={h1}>Vous êtes dans la boucle 👋</Heading>
                <Text style={text}>
                    Merci de votre intérêt pour Wiply !
                </Text>
                <Text style={text}>
                    Vous serez parmi les premiers informés des nouveautés et du lancement officiel. On prépare quelque chose de bien pour les agences web — restez connecté.
                </Text>
                <Text style={smallText}>
                    Vous recevez cet email car vous vous êtes inscrit sur wiply.fr. Si ce n'est pas vous, vous pouvez ignorer cet email.
                </Text>
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

const hr = {
    borderColor: "#f3f4f6",
    margin: "32px 0 24px"
};

const footer = {
    color: "#9ca3af",
    fontSize: "12px",
    textAlign: "center" as const
};
