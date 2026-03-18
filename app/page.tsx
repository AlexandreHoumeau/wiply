import { LandingPageClient } from "@/components/LandingPageClient";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wiply.fr";

export const metadata: Metadata = {
  title: "Wiply — CRM et gestion de projets pour agences web",
  description:
    "Wiply connecte votre prospection à vos projets. CRM léger, relances IA, portail client et kanban collaboratif — conçu pour les agences web et digitales.",
  alternates: {
    canonical: siteUrl,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Wiply",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.svg`,
      },
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "Wiply",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Plan gratuit disponible, plan Pro à 39€/mois",
      },
      description:
        "Logiciel de gestion pour agences web : CRM, pipeline commercial, relances IA, kanban de projets et portail client.",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "En quoi Wiply est différent de Notion ou Trello ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Notion et Trello sont des outils génériques de gestion de contenu ou de tâches. Wiply est conçu spécifiquement pour les agences : il connecte votre pipeline commercial à vos projets, intègre un CRM léger, mesure l'engagement de vos prospects et génère des messages de relance avec l'IA. C'est un outil métier, pas un outil généraliste.",
          },
        },
        {
          "@type": "Question",
          name: "Est-ce que je peux inviter mes clients sur Wiply ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vos clients n'ont pas besoin de créer un compte. Vous leur envoyez simplement un lien magique pour accéder au portail de leur projet — ils voient l'avancement en lecture seule, sans friction.",
          },
        },
        {
          "@type": "Question",
          name: "Faut-il configurer l'IA avant de pouvoir l'utiliser ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. Vous pouvez commencer à générer des messages sans aucune configuration. La personnalisation (contexte de l'agence, ton, arguments clés) est optionnelle mais recommandée pour des messages plus pertinents.",
          },
        },
        {
          "@type": "Question",
          name: "Mes données sont-elles sécurisées ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Wiply est hébergé en Europe sur Supabase (infrastructure PostgreSQL) avec authentification sécurisée, accès contrôlé par rôle, et chiffrement des données en transit et au repos. Les paiements sont gérés par Stripe, le standard de l'industrie.",
          },
        },
        {
          "@type": "Question",
          name: "Puis-je tester les fonctionnalités Pro avant de m'abonner ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, nous pouvons activer un accès démo Pro limité dans le temps sur demande. Contactez-nous pour en bénéficier.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageClient />
    </>
  );
}
