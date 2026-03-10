"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqData = [
  {
    question: "En quoi Wiply est différent de Notion ou Trello ?",
    answer: "Notion et Trello sont des outils génériques de gestion de contenu ou de tâches. Wiply est conçu spécifiquement pour les agences : il connecte votre pipeline commercial à vos projets, intègre un CRM léger, mesure l'engagement de vos prospects et génère des messages de relance avec l'IA. C'est un outil métier, pas un outil généraliste."
  },
  {
    question: "Est-ce que je peux inviter mes clients sur Wiply ?",
    answer: "Vos clients n'ont pas besoin de créer un compte. Vous leur envoyez simplement un lien magique pour accéder au portail de leur projet — ils voient l'avancement en lecture seule, sans friction."
  },
  {
    question: "Faut-il configurer l'IA avant de pouvoir l'utiliser ?",
    answer: "Non. Vous pouvez commencer à générer des messages sans aucune configuration. La personnalisation (contexte de l'agence, ton, arguments clés) est optionnelle mais recommandée pour des messages plus pertinents."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui. Wiply est hébergé en Europe sur Supabase (infrastructure PostgreSQL) avec authentification sécurisée, accès contrôlé par rôle, et chiffrement des données en transit et au repos. Les paiements sont gérés par Stripe, le standard de l'industrie."
  },
  {
    question: "Puis-je tester les fonctionnalités Pro avant de m'abonner ?",
    answer: "Oui, nous pouvons activer un accès démo Pro limité dans le temps sur demande. Contactez-nous pour en bénéficier."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="pt-24 pb-12 px-4 sm:px-6 max-w-3xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-wide mb-4">
          Questions fréquentes
        </h2>
        <p className="text-[#7A7A7A] text-base sm:text-lg">
          Tout ce que vous devez savoir avant de vous lancer.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="space-y-4"
      >
        {faqData.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
              }}
              className={`bg-white rounded-2xl border transition-colors duration-300 ${isOpen ? "border-[#8B6DF8] shadow-[0_8px_30px_rgb(139,109,248,0.08)]" : "border-slate-100 shadow-sm hover:border-[#D3C1F5]"}`}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 focus:outline-none"
              >
                <span className={`font-bold text-base sm:text-[17px] transition-colors duration-300 ${isOpen ? "text-[#8B6DF8]" : "text-[#4C4C4C]"}`}>
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={`shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isOpen ? "bg-[#F1EFFD] text-[#8B6DF8]" : "bg-slate-50 text-slate-400"}`}
                >
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 text-[#7A7A7A] leading-relaxed text-[15px]">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
