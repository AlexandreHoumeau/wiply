"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export function PricingSection() {
  return (
    <section id="pricing" className="pt-24 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-12 sm:mb-16"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-wide">
          Commencez gratuitement,
        </h2>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FBC28D] to-[#8B6DF8] font-[family-name:var(--font-passion-one)] tracking-wide">
          évoluez quand vous êtes prêt
        </h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        className="flex flex-col md:flex-row gap-6 sm:gap-8 justify-center items-stretch"
      >
        {/* Free plan */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
          }}
          className="flex-1"
        >
          <div className="h-full bg-white p-7 sm:p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col transition-transform duration-300 hover:scale-[1.02]">
            <div className="mb-6 sm:mb-8">
              <h3 className="text-2xl font-bold text-[#4C4C4C] mb-2">Gratuit</h3>
              <p className="text-[#7A7A7A] text-sm">Pour les freelances qui démarrent.</p>
            </div>
            <div className="mb-6 sm:mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)]">0 €</span>
              <span className="text-[#7A7A7A] font-medium">/ mois</span>
            </div>
            <Link href="/auth/signup" className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-[#F1EFFD] text-[#8B6DF8] font-bold text-center hover:bg-[#E5E0FA] transition-colors mb-8 sm:mb-10">
              Commencer gratuitement
            </Link>
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] font-semibold">2 Projets</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] font-semibold">1 Membre (vous seul)</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Pipeline commercial</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Tracking de liens</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Portail client</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Espace interne</span></div>
              <div className="flex items-center gap-3 opacity-40 pt-2"><X className="w-5 h-5 text-[#7A7A7A] shrink-0" strokeWidth={2} /><span className="text-[#7A7A7A] text-[15px]">Génération de messages IA</span></div>
              <div className="flex items-center gap-3 opacity-40"><X className="w-5 h-5 text-[#7A7A7A] shrink-0" strokeWidth={2} /><span className="text-[#7A7A7A] text-[15px]">Configuration IA personnalisée</span></div>
              <div className="flex items-center gap-3 opacity-40"><X className="w-5 h-5 text-[#7A7A7A] shrink-0" strokeWidth={2} /><span className="text-[#7A7A7A] text-[15px]">Collaboration d'équipe</span></div>
              <div className="flex items-center gap-3 opacity-40"><X className="w-5 h-5 text-[#7A7A7A] shrink-0" strokeWidth={2} /><span className="text-[#7A7A7A] text-[15px]">Support prioritaire</span></div>
            </div>
          </div>
        </motion.div>

        {/* Pro plan */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
          }}
          className="flex-1"
        >
          <div className="h-full bg-white p-7 sm:p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgb(139,109,248,0.12)] border-2 border-[#8B6DF8] flex flex-col relative md:-translate-y-4 transition-transform duration-300 hover:md:-translate-y-6">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8B6DF8] to-[#6A82FB] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
              Le plus choisi
            </div>
            <div className="mb-6 sm:mb-8">
              <h3 className="text-2xl font-bold text-[#8B6DF8] mb-2">Pro</h3>
              <p className="text-[#7A7A7A] text-sm">Pour les agences qui accélèrent.</p>
            </div>
            <div className="mb-6 sm:mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)]">39 €</span>
              <span className="text-[#7A7A7A] font-medium">/ mois</span>
            </div>
            <Link href="/auth/signup" className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-gradient-to-r from-[#8B6DF8] to-[#6A82FB] text-white font-bold text-center hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200 mb-8 sm:mb-10">
              Passer au Pro
            </Link>
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] font-semibold">Projets illimités</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] font-semibold">Jusqu'à 6 membres</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Pipeline commercial</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Tracking de liens</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Portail client</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px]">Espace interne</span></div>
              <div className="flex items-center gap-3 pt-2"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px] font-medium">Génération de messages IA</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px] font-medium">Configuration IA personnalisée</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px] font-medium">Collaboration d'équipe</span></div>
              <div className="flex items-center gap-3"><Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2.5} /><span className="text-[#4C4C4C] text-[15px] font-medium">Support prioritaire</span></div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-12 sm:mt-16 text-center"
      >
        <p className="text-[#7A7A7A] text-[15px] font-medium">
          Sans engagement <span className="mx-2 text-[#D3C1F5]">•</span> Résiliable à tout moment <span className="mx-2 text-[#D3C1F5]">•</span> Paiement sécurisé via Stripe
        </p>
      </motion.div>
    </section>
  );
}
