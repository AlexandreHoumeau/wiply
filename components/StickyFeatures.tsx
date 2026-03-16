"use client";

import { AnimatePresence, motion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { Check } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FeaturePlayer } from "./FeaturePlayer";

// Lazy-load compositions so each is its own chunk
const PipelineComposition = dynamic(() =>
  import("@/remotion/compositions/PipelineComposition").then((m) => m.PipelineComposition)
);
const TrackingComposition = dynamic(() =>
  import("@/remotion/compositions/TrackingComposition").then((m) => m.TrackingComposition)
);
const AiComposition = dynamic(() =>
  import("@/remotion/compositions/AiComposition").then((m) => m.AiComposition)
);
const KanbanComposition = dynamic(() =>
  import("@/remotion/compositions/KanbanComposition").then((m) => m.KanbanComposition)
);
const PortailComposition = dynamic(() =>
  import("@/remotion/compositions/PortailComposition").then((m) => m.PortailComposition)
);

// 700×500 = 1.4 aspect ratio matching the CSS aspect-[1.4]
const COMP_W = 700;
const COMP_H = 500;
const FPS = 30;

const featureCompositions = [
  { component: PipelineComposition, durationInFrames: 180, fps: FPS, compositionWidth: COMP_W, compositionHeight: COMP_H },
  { component: TrackingComposition, durationInFrames: 250, fps: FPS, compositionWidth: COMP_W, compositionHeight: COMP_H },
  { component: AiComposition, durationInFrames: 250, fps: FPS, compositionWidth: COMP_W, compositionHeight: COMP_H },
  { component: KanbanComposition, durationInFrames: 450, fps: FPS, compositionWidth: COMP_W, compositionHeight: COMP_H },
  { component: PortailComposition, durationInFrames: 450, fps: FPS, compositionWidth: COMP_W, compositionHeight: COMP_H },];

const featuresData = [
  {
    title: "Prospection & Pipeline commercial",
    subtitle: "Gardez le contrôle sur chaque opportunité.",
    description: "Un pipeline visuel en 7 étapes pour ne jamais perdre le fil : de la prise de contact initiale à la signature, en passant par la proposition et la négociation.",
    bullets: [
      "Créer des fiches opportunités avec toutes les infos de l'entreprise",
      "Suivre l'avancement par statut",
      "Marquer vos priorités en favoris pour les retrouver immédiatement",
      "Centraliser l'historique de chaque échange (notes, commentaires...)",
      "Suivre vos prospects par canal : email, téléphone, réseaux sociaux"
    ],
    extra: "KPIs en temps réel : Taux de conversion, opportunités actives, prospects engagés sur 7 jours."
  },
  {
    title: "Tracking de liens & Analyse",
    subtitle: "Sachez exactement quand vos prospects interagissent.",
    description: "Créez des liens de tracking en quelques secondes et mesurez l'engagement en temps réel.",
    bullets: [
      "Générer des liens trackés pour chaque opportunité (propositions, portfolios...)",
      "Suivre les clics, les visiteurs uniques, les appareils utilisés",
      "Définir une date d'expiration pour chaque lien",
      "Recevoir des suggestions de relance basées sur l'activité"
    ],
    extra: "Exemple : Wiply vous indique que le prospect a consulté 3 fois votre portfolio en 2 jours — le moment idéal pour relancer."
  },
  {
    title: "Générateur de messages IA",
    subtitle: "Des relances percutantes, en quelques secondes.",
    description: "Plus besoin de passer 30 minutes à tourner en rond devant un message vide. L'IA de Wiply génère des messages personnalisés.",
    bullets: [
      "Générer des messages pour email, LinkedIn ou Instagram en un clic",
      "Choisir le ton (professionnel, amical) et la longueur",
      "Affiner le résultat avec un contexte libre",
      "Conserver l'historique de vos messages générés"
    ],
    extra: "Configurez une fois, gagnez du temps à chaque relance : l'IA intègre vos arguments clés automatiquement."
  },
  {
    title: "Gestion de projets & Kanban",
    subtitle: "Livrez vos projets sans jamais perdre le fil.",
    description: "Un Kanban simple et efficace pour piloter chaque projet client : de la phase de définition à la livraison finale.",
    bullets: [
      "Organiser les tâches en 4 colonnes (À faire → En cours → En revue → Terminé)",
      "Définir la priorité et la catégorie de chaque tâche",
      "Assigner chaque tâche à un membre de l'équipe",
      "Intégrer vos outils : Figma, GitHub, URL de déploiement"
    ],
    extra: "Convertissez une opportunité gagnée en projet en un clic — tout est pré-rempli."
  },
  {
    title: "Portail client",
    subtitle: "Donnez de la visibilité à vos clients.",
    description: "Partagez un lien unique avec votre client pour qu'il suive l'avancement de son projet — sans créer de compte.",
    bullets: [
      "Générer un lien magique par projet (révocable à tout moment)",
      "Afficher ou masquer la progression selon vos préférences",
      "Laisser un message personnalisé dans le portail"
    ],
    extra: "Fini les « c'est où en est mon projet ? » par email."
  },
];

export function StickyFeatures() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 30, stiffness: 200 });
  const pathData = useTransform(smoothVelocity, (v) => {
    const bendMax = 0.05;
    const mappedV = Math.max(-1500, Math.min(1500, v));
    const b = (mappedV / 1500) * bendMax;
    const topY = 0.05;
    const botY = 0.95;
    const rX = 0.03;
    const rY = 0.04;
    return `M 0, ${topY + rY}
        Q 0, ${topY} ${rX}, ${topY}
        Q 0.5, ${topY + b} ${1 - rX}, ${topY}
        Q 1, ${topY} 1, ${topY + rY}
        L 1, ${botY - rY}
        Q 1, ${botY} ${1 - rX}, ${botY}
        Q 0.5, ${botY + b} ${rX}, ${botY}
        Q 0, ${botY} 0, ${botY - rY}
        Z`;
  });

  return (
    <section id="features" className="relative max-w-9/10 mx-auto px-4 sm:px-6 z-10 pb-20">
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <clipPath id="jelly-clip" clipPathUnits="objectBoundingBox">
            <motion.path d={pathData} />
          </clipPath>
        </defs>
      </svg>

      {/* Mobile layout */}
      <div className="flex flex-col gap-16 sm:gap-24 lg:hidden pt-16 sm:pt-24">
        {featuresData.map((feature, idx) => (
          <div key={idx} className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#4C4C4C] leading-[1] tracking-wide font-[family-name:var(--font-passion-one)]">
                {feature.title}
              </h3>
              <p className="text-[#8B6DF8] font-bold mt-3 sm:mt-4 text-sm">{feature.subtitle}</p>
            </div>
            <div className="space-y-6 sm:space-y-8 text-[#4C4C4C]">
              <p className="leading-relaxed text-[15px]">{feature.description}</p>
              <div>
                <p className="font-bold mb-3 text-[15px]">Ce que vous pouvez faire :</p>
                <ul className="space-y-2">
                  {feature.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex gap-3 text-[14px]">
                      <Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={2} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="w-full aspect-[1.4] drop-shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <motion.div
                className="w-full h-full overflow-hidden"
              >
                <FeaturePlayer {...featureCompositions[idx]} />
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex gap-4 items-start pt-10">
        <div className="w-[40%] sticky top-[25vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="pr-4"
            >
              <h3 className="text-[52px] xl:text-[56px] font-black text-[#4C4C4C] leading-[1] tracking-wide font-[family-name:var(--font-passion-one)]">
                {featuresData[activeIndex].title}
              </h3>
              <p className="text-[#8B6DF8] font-bold text-base mt-4">
                {featuresData[activeIndex].subtitle}
              </p>
              <div className="mt-12 space-y-6 text-[#4C4C4C]">
                <p className="leading-relaxed text-[15px] xl:text-[16px]">
                  {featuresData[activeIndex].description}
                </p>
                <div>
                  <p className="font-bold mb-4 text-[15px] xl:text-[16px]">Ce que vous pouvez faire :</p>
                  <ul className="space-y-2">
                    {featuresData[activeIndex].bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex gap-3 text-[14px] xl:text-[15px] leading-snug">
                        <Check className="w-5 h-5 text-[#8B6DF8] shrink-0" strokeWidth={1.5} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {featuresData[activeIndex].extra && (
                <p className="text-sm italic text-[#7A7A7A] mt-8">
                  {featuresData[activeIndex].extra}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-[60%] flex flex-col gap-[80vh] pb-[40vh] pt-[35vh]">
          {featuresData.map((_, idx) => (
            <motion.div
              key={idx}
              onViewportEnter={() => setActiveIndex(idx)}
              viewport={{ margin: "-50% 0px -50% 0px" }}
              className={`w-full aspect-[1.4] transition-opacity duration-700 ${activeIndex === idx ? "opacity-100" : "opacity-40"}`}
            >
              <motion.div
                // style={{ clipPath: "url(#jelly-clip)" }}
                className="w-full h-full overflow-hidden"
              >
                <FeaturePlayer {...featureCompositions[idx]} />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
