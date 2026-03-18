"use client";

import { FAQSection } from "@/components/FAQSection";
import { FooterSection } from "@/components/FooterSection";
import { HeroSection } from "@/components/HeroSection";
import { NewsletterSection } from "@/components/NewsletterSection";
import { PricingSection } from "@/components/PricingSection";
import { StickyFeatures } from "@/components/StickyFeatures";
import { PublicNavbar } from "@/components/PublicNavbar";
import { motion, useScroll, useTransform } from "framer-motion";
import { CircleHelp, History, ListTodo } from "lucide-react";
import { useRef } from "react";

export function LandingPageClient() {
  const dynamicContentRef = useRef(null);
  const { scrollY } = useScroll();

  const heroWidth = useTransform(scrollY, [0, 400], ["94%", "100%"]);
  const heroHeight = useTransform(scrollY, [0, 400], ["90vh", "100vh"]);
  const heroTop = useTransform(scrollY, [0, 400], ["5vh", "0vh"]);
  const heroBorderRadius = useTransform(scrollY, [0, 400], ["2.5rem", "0rem"]);
  const heroShadow = useTransform(scrollY, [0, 400], ["0 30px 60px rgba(139,109,248,0.15)", "0 0px 0px rgba(0,0,0,0)"]);

  const { scrollYProgress } = useScroll({
    target: dynamicContentRef,
    offset: ["start start", "end end"]
  });

  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.3, 0.6, 1],
    ["#F1EFFD", "#F3E8FF", "#FFF0E6", "#FFFFFF"]
  );

  return (
    <div className="flex flex-col min-h-screen text-[#4C4C4C] font-sans bg-[#FFFDF8]">
      {/* Hero sticky expand wrapper */}
      <div className="relative w-full h-[150vh] bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8]">
        <motion.div
          style={{ width: heroWidth, height: heroHeight, top: heroTop, borderRadius: heroBorderRadius, boxShadow: heroShadow }}
          className="mx-auto sticky z-20 flex flex-col overflow-hidden bg-[#FFFDF8] border border-white/50"
        >
          <PublicNavbar />
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <HeroSection />
          </div>
        </motion.div>
      </div>

      <motion.main ref={dynamicContentRef} style={{ backgroundColor }} className="flex-1 relative z-10">
        <StickyFeatures />

        {/* Problems section */}
        <section className="pt-8 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-[2rem] p-6 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100"
          >
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] leading-[1.05] tracking-wide md:w-1/2">
                Les 3 problèmes que vivent toutes les agences web
              </h2>
              <p className="text-base text-[#7A7A7A] md:w-1/2 leading-relaxed pt-1">
                Vous prospectez dans un <strong className="text-[#4C4C4C] font-semibold">Google Sheet</strong>, gérez vos projets sur <strong className="text-[#4C4C4C] font-semibold">Notion</strong>, suivez vos tâches sur <strong className="text-[#4C4C4C] font-semibold">Trello</strong> et espérez que vos relances ne se perdent pas dans votre boîte mail.
              </p>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10"
            >
              {[
                { icon: <ListTodo strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Trop d'outils, pas assez de contexte", body: "Votre pipeline commercial est déconnecté de votre gestion de projet. Quand une opportunité devient client, tout recommence à zéro." },
                { icon: <History strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Les relances prennent un temps fou", body: "Rédiger un message personnalisé pour chaque prospect, trouver le bon ton, adapter au canal... C'est 30 minutes de perdu." },
                { icon: <CircleHelp strokeWidth={1.5} className="w-8 h-8 text-[#4C4C4C] transition-all duration-300 transform group-hover:text-[#8B6DF8]" />, title: "Vous ne savez pas ce que font vos prospects", body: "Ont-ils ouvert votre proposition ? Cliqué sur votre lien ? Vous envoyez dans le vide." },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } } }}
                  className="group cursor-default"
                >
                  <div className="mb-4 overflow-hidden h-8 flex items-end">{item.icon}</div>
                  <h3 className="text-lg font-bold text-[#4C4C4C] leading-tight mb-2">{item.title}</h3>
                  <p className="text-[#7A7A7A] leading-relaxed text-sm">{item.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Why us section */}
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
      </motion.main>
    </div>
  );
}
