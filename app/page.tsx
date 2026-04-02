import type { Metadata } from "next";
import { PublicNavbar } from "@/components/PublicNavbar";
import { HeroSection } from "@/components/HeroSection";
import { StickyFeatures } from "@/components/StickyFeatures";
import { NewsletterSection } from "@/components/NewsletterSection";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import { FooterSection } from "@/components/FooterSection";
import { CircleHelp, History, ListTodo } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wiply.fr";

export const metadata: Metadata = {
  title: "Wiply — CRM et gestion de projets pour agences web",
  description:
    "Wiply connecte votre prospection à vos projets. CRM léger, relances IA, portail client et kanban collaboratif - conçu pour les agences web et digitales.",
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
            text: "Vos clients n'ont pas besoin de créer un compte. Vous leur envoyez simplement un lien magique pour accéder au portail de leur projet - ils voient l'avancement en lecture seule, sans friction.",
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
      <div className="flex flex-col min-h-screen text-[#4C4C4C] font-sans bg-[#FFFDF8]">
        <div className="relative w-full h-[150vh] bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8]">
          <div className="mx-auto sticky top-0 z-20 flex flex-col overflow-hidden bg-[#FFFDF8] border border-white/50 w-full min-h-screen">
            <PublicNavbar />
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <HeroSection />
            </div>
          </div>
        </div>

        <main className="flex-1 relative z-10 bg-[linear-gradient(180deg,#F1EFFD_0%,#F3E8FF_35%,#FFF0E6_72%,#FFFFFF_100%)]">
          <StickyFeatures />

          <section className="pt-8 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start mb-10 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] leading-[1.05] tracking-wide md:w-1/2">
                  Les 3 problèmes que vivent toutes les agences web
                </h2>
                <p className="text-base text-[#7A7A7A] md:w-1/2 leading-relaxed pt-1">
                  Vous prospectez dans un <strong className="text-[#4C4C4C] font-semibold">Google Sheet</strong>, gérez vos projets sur <strong className="text-[#4C4C4C] font-semibold">Notion</strong>, suivez vos tâches sur <strong className="text-[#4C4C4C] font-semibold">Trello</strong> et espérez que vos relances ne se perdent pas dans votre boîte mail.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                {[
                  { icon: <ListTodo strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Trop d'outils, pas assez de contexte", body: "Votre pipeline commercial est déconnecté de votre gestion de projet. Quand une opportunité devient client, tout recommence à zéro." },
                  { icon: <History strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Les relances prennent un temps fou", body: "Rédiger un message personnalisé pour chaque prospect, trouver le bon ton, adapter au canal... C'est 30 minutes de perdu." },
                  { icon: <CircleHelp strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Vous ne savez pas ce que font vos prospects", body: "Ont-ils ouvert votre proposition ? Cliqué sur votre lien ? Vous envoyez dans le vide." },
                ].map((item) => (
                  <div key={item.title} className="group cursor-default">
                    <div className="mb-4 overflow-hidden h-8 flex items-end">{item.icon}</div>
                    <h3 className="text-lg font-bold text-[#4C4C4C] leading-tight mb-2">{item.title}</h3>
                    <p className="text-[#7A7A7A] leading-relaxed text-sm">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pt-24 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12 sm:mb-16">
              <p className="text-[#8B6DF8] text-sm font-semibold mb-3">Pourquoi nous ?</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-wide">
                Wiply connecte votre prospection à votre livraison
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { n: "1", title: "Prospection intelligente", body: "Gérez votre pipeline, trackez l'engagement et relancez au bon moment" },
                { n: "2", title: "Messages IA personnalisés", body: "Générez des relances sur-mesure en quelques secondes" },
                { n: "3", title: "Projets & livraison", body: "Kanban collaboratif avec portail client intégré" },
              ].map((card) => (
                <div key={card.n} className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-start text-left transition-transform duration-300 hover:-translate-y-1">
                  <div className="text-[100px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#FAD9A1] to-[#D3C1F5] mb-4">
                    {card.n}
                  </div>
                  <h3 className="text-xl font-bold text-[#4C4C4C] mb-3">{card.title}</h3>
                  <p className="text-[#7A7A7A] text-[15px] leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </section>

          <NewsletterSection />
          <PricingSection />
          <FAQSection />
          <FooterSection />
        </main>
      </div>
    </>
  );
}
