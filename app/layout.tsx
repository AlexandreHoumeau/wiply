import { CookieConsent } from "@/components/cookie-consent";
import type { Metadata } from "next";
import { Inter, Passion_One } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const passionOne = Passion_One({
  variable: "--font-passion-one",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wiply.fr'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wiply — CRM et gestion de projets pour agences web",
    template: "%s | Wiply",
  },
  description:
    "Wiply connecte votre prospection à vos projets. CRM léger, relances IA, portail client et kanban collaboratif — conçu pour les agences web et digitales.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Wiply",
    title: "Wiply — CRM et gestion de projets pour agences web",
    description:
      "Wiply connecte votre prospection à vos projets. CRM léger, relances IA, portail client et kanban collaboratif — conçu pour les agences web et digitales.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Wiply — CRM et gestion de projets pour agences web",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wiply — CRM et gestion de projets pour agences web",
    description:
      "Wiply connecte votre prospection à vos projets. CRM léger, relances IA, portail client et kanban collaboratif — conçu pour les agences web et digitales.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" translate="no" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${passionOne.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
