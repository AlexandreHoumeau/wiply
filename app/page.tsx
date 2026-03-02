"use client";

import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  Wand2, 
  ShieldCheck, 
  Palette, 
  ListTodo,
  Building2,
  Zap,
  Layout,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* --- NAVIGATION --- */}
      <header className="px-6 lg:px-10 h-20 flex items-center fixed w-full top-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Wiply</span>
        </Link>
        <nav className="ml-auto flex gap-6 items-center">
          <Link className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:block" href="#features">
            Fonctionnalités
          </Link>
          <Link className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:block" href="#pricing">
            Tarifs
          </Link>
          <Link className="text-sm font-medium text-white hover:text-blue-400 transition-colors" href="/auth/login">
            Connexion
          </Link>
          <Button asChild className="bg-white text-slate-950 hover:bg-slate-200 font-semibold px-6">
            <Link href="/auth/signup">Essayer <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="pt-40 pb-20 lg:pt-52 lg:pb-32 px-6 text-center relative">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 backdrop-blur-md mb-4">
              <Zap className="mr-2 h-4 w-4 text-blue-400" />
              <span>Le nouvel OS des agences web modernes</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Arrêtez de gérer le chaos. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Pilotez votre production.
              </span>
            </h1>
            <p className="max-w-[700px] mx-auto text-slate-400 md:text-xl leading-relaxed">
              Entre la signature du devis et la mise en ligne, c'est le trou noir. 
              Wiply est l'outil "zéro friction" qui centralise vos clients,
              vos contenus et vos validations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center pt-8">
              <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg shadow-xl shadow-blue-600/20 border border-blue-400/20" asChild>
                <Link href="/signup">
                  Lancer mon premier projet (Gratuit)
                </Link>
              </Button>
            </div>

            {/* Abstract Dashboard Mockup */}
            <div className="mt-20 relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-indigo-600/20 blur-[100px] -z-10 rounded-full opacity-50"></div>
              <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 {/* Fake UI Header */}
                 <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4 px-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="flex-1 text-center text-xs text-slate-500 font-mono">dashboard.wiply.fr</div>
                 </div>
                 {/* Fake UI Body */}
                 <div className="grid grid-cols-3 gap-4 opacity-80">
                    <div className="bg-white/5 rounded-xl p-6 h-40 animate-pulse"></div>
                    <div className="bg-white/5 rounded-xl p-6 h-40 col-span-2 flex items-center justify-center border border-blue-500/30 relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 animate-pulse"></div>
                       <span className="text-blue-300 font-semibold text-lg relative z-10 flex items-center gap-2">
                        <Zap className="w-5 h-5" /> Projet en cours : Refonte Site Alpha
                       </span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 h-60 col-span-3 flex gap-4 items-center">
                       <div className="flex-1 space-y-4">
                          <div className="h-4 bg-white/10 rounded w-3/4"></div>
                          <div className="h-4 bg-white/10 rounded w-1/2"></div>
                          <div className="h-4 bg-white/10 rounded w-5/6"></div>
                       </div>
                       <div className="w-1/3 h-full bg-indigo-500/10 rounded-xl border border-indigo-500/20 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-300 font-bold">
                             Portail Client Vue
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- WOW FEATURES SECTION --- */}
        <section id="features" className="py-32 relative">
          <div className="max-w-6xl mx-auto px-6 space-y-32">
            <div className="text-center space-y-4 relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Le MVP que vos chefs de projet <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">attendaient.</span>
              </h2>
              <p className="text-slate-400 max-w-[600px] mx-auto text-lg">
                Concentrez-vous sur la création. Nous automatisons la friction.
              </p>
            </div>

            {/* Feature 1: Portail Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
               <div className="order-2 md:order-1 relative">
                  {/* Visual Abstraction */}
                  <div className="aspect-square rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-white/10 p-8 relative overflow-hidden flex items-center justify-center shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)]">
                     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/0 to-slate-900/0"></div>
                     <Layout className="w-32 h-32 text-blue-500/50 absolute ml-4 mt-4" />
                     <div className="bg-slate-950/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 relative z-10 w-2/3 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/50">
                           <Wand2 className="text-white w-6 h-6" />
                        </div>
                        <p className="text-lg font-bold text-white">Bienvenue, Client</p>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full w-1/2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        </div>
                        <p className="text-xs text-slate-400">Projet à 50%</p>
                     </div>
                  </div>
               </div>
               <div className="space-y-6 order-1 md:order-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                     <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold">Le Portail "Anti-Geek"</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">
                     Votre client n'a pas envie de créer un compte. Envoyez-lui un **lien magique**. Il accède instantanément à une interface épurée : progression du projet, livrables, et c'est tout. Zéro friction.
                  </p>
               </div>
            </div>

            {/* Feature 2: Content Gatherer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
               <div className="space-y-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                     <ListTodo className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold">Le Chasseur de Contenus</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">
                     Cessez de courir après les fichiers via WeTransfer ou des chaînes d'emails infinies. Créez une **checklist partagée** (Logo, Textes, Photos). Le client dépose, vous êtes notifié. Simple et redoutable.
                  </p>
               </div>
               <div className="relative">
                  {/* Visual Abstraction */}
                  <div className="aspect-square rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-white/10 p-8 relative overflow-hidden flex flex-col gap-4 justify-center shadow-[0_0_50px_-12px_rgba(249,115,22,0.5)]">
                     <div className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-xl backdrop-blur-sm opacity-50">
                        <div className="w-6 h-6 rounded border-2 border-slate-600"></div>
                        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                     </div>
                      <div className="flex items-center gap-4 p-4 bg-slate-950/80 border border-orange-500/30 rounded-xl backdrop-blur-md relative z-10 shadow-lg shadow-orange-500/10 transform scale-105">
                        <CheckCircle2 className="w-6 h-6 text-orange-500" />
                        <div className="text-white font-medium">Fichiers du Logo HD</div>
                        <div className="ml-auto text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">Reçu !</div>
                     </div>
                     <div className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-xl backdrop-blur-sm opacity-50">
                        <div className="w-6 h-6 rounded border-2 border-slate-600"></div>
                        <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                     </div>
                  </div>
               </div>
            </div>
             
             {/* Feature 3 & 4 combined quickly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
               <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors hover:border-blue-500/30 group">
                  <ShieldCheck className="w-10 h-10 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-3">Validation par Jalons</h3>
                  <p className="text-slate-400">Le client doit cliquer sur "Je valide cette étape". Un log est créé. Fini le "je n'ai jamais dit ça" au moment de la facture finale.</p>
               </div>
               <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 hover:bg-slate-800/50 transition-colors hover:border-purple-500/30 group">
                  <Palette className="w-10 h-10 text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-3">Marque Blanche V1</h3>
                  <p className="text-slate-400">Le portail client est à vos couleurs, avec votre logo. Pour le client, c'est VOTRE plateforme, pas la nôtre.</p>
               </div>
            </div>

          </div>
        </section>

        {/* --- PRICING SECTION (WOW VERSION) --- */}
        <section id="pricing" className="py-32 relative bg-slate-950 border-t border-white/5">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/0 to-slate-950/0 pointer-events-none"></div>
          <div className="max-w-5xl mx-auto space-y-16 relative z-10 px-6">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight">Tarifs limpides. ROI immédiat.</h2>
              <p className="text-slate-400 max-w-[600px] mx-auto text-lg">
                Rentabilisé dès les premières heures gagnées sur un projet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative">
              {/* Glowing Connector */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/30 blur-[80px] hidden md:block pointer-events-none"></div>

              {/* Free Plan */}
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 flex flex-col hover:bg-slate-800/50 transition-all relative backdrop-blur-md">
                <h3 className="text-xl font-bold text-slate-200">Testeur</h3>
                <div className="mt-6 flex items-baseline text-5xl font-extrabold">
                  0€
                </div>
                <p className="mt-4 text-slate-400 mb-8">Pour tester l'outil sur un vrai client sans sortir la carte bleue.</p>
                <ul className="space-y-4 flex-1">
                  <PricingItem text="1 Projet actif" />
                  <PricingItem text="Portail client magique" />
                  <PricingItem text="Checklists de contenus" />
                  <PricingItem text="Tracking d'emails" />
                </ul>
                <Button className="mt-10 w-full bg-white/10 hover:bg-white/20 text-white border border-white/10" asChild>
                  <Link href="/signup">Commencer gratuitement</Link>
                </Button>
              </div>

              {/* Pro Plan (WOW Effect) */}
              <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 border-2 border-blue-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-blue-500/20 transform md:scale-105 z-10">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">
                  L'offre agence
                </div>
                <h3 className="text-xl font-bold text-white relative z-10 flex items-center gap-2">
                   Agence Pro <Lock className="w-4 h-4 text-blue-400" />
                </h3>
                <div className="mt-6 flex items-baseline text-5xl font-extrabold relative z-10">
                  39€
                  <span className="ml-1 text-xl font-medium text-slate-400">/mois</span>
                </div>
                <p className="mt-4 text-blue-200 mb-8 relative z-10">Scalez votre production sans limites. Le cœur de votre agence.</p>
                <ul className="space-y-4 flex-1 relative z-10">
                  <PricingItem text="Projets illimités" glow />
                  <PricingItem text="Clients invités illimités" glow />
                  <PricingItem text="Marque blanche V1" />
                  <PricingItem text="Logs de validation" />
                  <PricingItem text="Support prioritaire" />
                </ul>
                <Button className="mt-10 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 relative z-10 text-lg h-12" asChild>
                  <Link href="/signup">Passer en illimité</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-24 relative overflow-hidden px-6">
           <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 z-0"></div>
           <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8 p-12 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                 Prêt à professionnaliser <br/>votre suivi de projet ?
              </h2>
              <p className="text-xl text-slate-300">
                 Rejoignez les agences qui ne courent plus après les contenus.
              </p>
              <Button size="lg" className="h-14 px-10 bg-white text-slate-900 hover:bg-slate-200 text-lg font-bold" asChild>
                <Link href="/signup">Créer mon compte gratuit</Link>
              </Button>
              <p className="text-slate-400 text-sm">Aucune carte de crédit requise.</p>
           </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/5 px-6 bg-slate-950 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
             <Building2 className="w-5 h-5 text-slate-400" />
             <p>© 2026 Wiply.</p>
          </div>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/politique-de-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Composants utilitaires modifiés pour le dark mode WOW
function PricingItem({ text, glow = false }: { text: string, glow?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${glow ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-blue-500'}`} />
      <span className="text-slate-300">{text}</span>
    </li>
  );
}