"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";

export function HeroSection() {
    // Petite animation réutilisable pour faire apparaître les éléments un par un
    const fadeInUp: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 flex flex-col items-center text-center">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.15 } } // Décale l'animation de chaque enfant
                }}
                className="flex flex-col items-center w-full max-w-6xl"
            >
                {/* BADGE TOP */}
                <motion.div
                    variants={fadeInUp}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-full border border-[#D1CBFA] bg-white/50 backdrop-blur-sm text-sm font-medium text-[#7A7A7A] mb-10"
                >
                    Le nouvel OS des agences web modernes
                </motion.div>

                {/* GROS TITRES */}
                <motion.h1
                    variants={fadeInUp}
                    className="flex flex-col items-center gap-1 w-full"
                >
                    {/* Ligne 1 : Gris foncé */}
                    <span className="text-4xl sm:text-5xl md:text-7xl lg:text-[80px] font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] leading-[0.95] tracking-wide">
                        Un outil pour les agences web
                    </span>

                    {/* Ligne 2 : Dégradé Pêche -> Violet */}
                    <span className="text-4xl sm:text-5xl md:text-7xl lg:text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FDE1BA] via-[#E8D2E1] to-[#C1B2FA] font-[family-name:var(--font-passion-one)] leading-[1.1] tracking-wide">
                        Créé par une agence web
                    </span>
                </motion.h1>

                {/* DESCRIPTION */}
                <motion.p
                    variants={fadeInUp}
                    className="max-w-3xl mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-[#4C4C4C] leading-relaxed"
                >
                    Pipeline commercial, gestion de projets et génération de messages IA - réunis dans une seule
                    plateforme conçue pour les agences web.
                </motion.p>

                {/* BOUTONS */}
                <motion.div
                    variants={fadeInUp}
                    className="mt-12 flex flex-col sm:flex-row gap-5"
                >
                    <Link
                        href="#features"
                        className="px-8 py-3.5 rounded-full border border-[#967CFB] text-[#967CFB] font-bold text-lg hover:bg-[#967CFB]/5 transition-colors bg-white shadow-sm flex items-center justify-center"
                    >
                        Voir les fonctionnalités
                    </Link>
                    <Link
                        href="/auth/signup"
                        className="px-8 py-3.5 rounded-full bg-[#967CFB] text-white font-bold text-lg hover:bg-[#8364f9] transition-colors shadow-sm flex items-center justify-center"
                    >
                        Lancer mon 1er projet (gratuit)
                    </Link>
                </motion.div>
            </motion.div>
        </section>
    );
}