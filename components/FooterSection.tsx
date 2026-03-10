"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Linkedin, Mail, Twitter } from "lucide-react";
import { useRef } from "react";

export function FooterSection() {
  const footerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.75, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const borderRadius = useTransform(scrollYProgress, [0, 1], ["5rem", "2.5rem"]);

  return (
    <footer ref={footerRef} className="pt-24 pb-8 relative z-10 flex flex-col items-center overflow-hidden">

      {/* CTA Section */}
      <div className="text-center mb-12 sm:mb-16 space-y-6 max-w-2xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-wide leading-tight">
          Prêt à gagner du temps sur chaque projet ?
        </h2>
        <Link
          href="/auth/signup"
          className="inline-block mt-4 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#8B6DF8] to-[#6A82FB] text-white font-bold hover:opacity-90 transition-opacity shadow-[0_10px_30px_rgba(139,109,248,0.3)] hover:-translate-y-1 transform duration-300"
        >
          Créer mon compte gratuitement
        </Link>
        <p className="text-sm text-[#7A7A7A] font-medium pt-2">
          Aucune carte bancaire <span className="mx-2 text-[#D3C1F5]">•</span> Prise en main immédiate
        </p>
      </div>

      {/* Animated footer box */}
      <motion.div
        style={{ scale, y, borderRadius, transformOrigin: "bottom center" }}
        className="w-[95%] bg-gradient-to-tr from-[#FDF0E1] via-[#F4EFFF] to-[#EBF0FE] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.02)] px-6 sm:px-8 md:px-16 pt-12 sm:pt-16 pb-8 flex flex-col justify-between mx-auto"
      >
        {/* Footer links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-4 sm:space-y-5">
            <span className="text-3xl font-black text-[#8B6DF8] font-[family-name:var(--font-passion-one)] tracking-wide">
              Wiply
            </span>
            <p className="text-[#7A7A7A] text-[15px] leading-relaxed">
              L'espace de travail unifié pour les agences web. Prospection, gestion de projet et livraison, le tout au même endroit.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" aria-label="Twitter" className="text-[#8B6DF8] hover:text-[#6A82FB] transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" aria-label="LinkedIn" className="text-[#8B6DF8] hover:text-[#6A82FB] transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="#" aria-label="Email" className="text-[#8B6DF8] hover:text-[#6A82FB] transition-colors"><Mail className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Product column */}
          <div>
            <h4 className="font-bold text-[#4C4C4C] mb-4 sm:mb-5 text-[15px] sm:text-[17px]">Produit</h4>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-[#7A7A7A] font-medium">
              <li><Link href="#features" className="hover:text-[#8B6DF8] transition-colors">Fonctionnalités</Link></li>
              <li><Link href="#pricing" className="hover:text-[#8B6DF8] transition-colors">Tarifs</Link></li>
              <li><span className="opacity-50 cursor-not-allowed">Mises à jour</span></li>
              <li><span className="opacity-50 cursor-not-allowed">Portail client</span></li>
            </ul>
          </div>

          {/* Resources column */}
          <div>
            <h4 className="font-bold text-[#4C4C4C] mb-4 sm:mb-5 text-[15px] sm:text-[17px]">Ressources</h4>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-[#7A7A7A] font-medium">
              <li><span className="opacity-50 cursor-not-allowed">Centre d'aide</span></li>
              <li><span className="opacity-50 cursor-not-allowed">Blog</span></li>
              <li><span className="opacity-50 cursor-not-allowed">Tutoriels & Guides</span></li>
              <li><span className="opacity-50 cursor-not-allowed">Modèles de relance</span></li>
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h4 className="font-bold text-[#4C4C4C] mb-4 sm:mb-5 text-[15px] sm:text-[17px]">Légal</h4>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-[#7A7A7A] font-medium">
              <li><Link href="/mentions-legales" className="hover:text-[#8B6DF8] transition-colors">Mentions légales</Link></li>
              <li><Link href="/politique-de-confidentialite" className="hover:text-[#8B6DF8] transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="/cgu" className="hover:text-[#8B6DF8] transition-colors">CGV</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 sm:pt-8 border-t border-white/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[#7A7A7A] text-[14px] sm:text-[15px] font-medium">
            © 2026 Wiply. Tous droits réservés.
          </p>
          <p className="text-[#7A7A7A] text-[14px] sm:text-[15px] flex items-center gap-1.5 font-medium">
            Créé par{" "}
            <Link href="https://atelier-voisin.fr/" target="_blank" rel="noopener noreferrer">
              <span className="text-[#4C4C4C] font-bold hover:text-[#8B6DF8] transition-colors">Atelier Voisin</span>
            </Link>
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
