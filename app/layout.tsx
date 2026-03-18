import { CookieConsent } from "@/components/cookie-consent";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { UpgradeDialogProvider } from "@/providers/UpgradeDialogProvider";
import type { Metadata } from "next";
import { Inter, Passion_One } from "next/font/google";
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
    default: "Wiply — Gestion de projet pour agences",
    template: "%s | Wiply",
  },
  description:
    "La plateforme de gestion de projet pensée pour les agences. Portail client, collecte de contenus, validation par jalons et marque blanche.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Wiply",
    title: "Wiply — Gestion de projet pour agences",
    description:
      "La plateforme de gestion de projet pensée pour les agences. Portail client, collecte de contenus, validation par jalons et marque blanche.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wiply — Gestion de projet pour agences",
    description:
      "La plateforme de gestion de projet pensée pour les agences. Portail client, collecte de contenus, validation par jalons et marque blanche.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${passionOne.variable} antialiased`}
      >
        <ReactQueryProvider>
          <UpgradeDialogProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </UpgradeDialogProvider>
        </ReactQueryProvider>
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}
