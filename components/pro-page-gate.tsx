'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCheckoutSession } from '@/actions/billing.server'
import { useAgency } from '@/providers/agency-provider'
import { Lock, Sparkles, FolderOpen, FileText, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const FEATURE_COPY = {
    quotes: {
        title: 'Débloquez les devis PRO',
        description: 'Créez des propositions commerciales professionnelles, suivez leur statut et relancez au bon moment.',
        bullets: [
            'Devis publics prêts à envoyer',
            'Mentions légales et conditions de paiement',
            'Suivi brouillon, envoyé, accepté ou refusé',
        ],
    },
    files: {
        title: 'Débloquez le drive PRO',
        description: "Centralisez vos fichiers d'agence et de projet dans un espace partagé avec 2 Go de stockage.",
        bullets: [
            'Drive partagé pour l’équipe',
            'Dossiers, liens et fichiers clients',
            'Accès rapide depuis les projets et tâches',
        ],
    },
    ai: {
        title: "Débloquez l'IA PRO",
        description: "Configurez et utilisez l'agent IA avec le plan PRO.",
        bullets: [
            'Génération de messages contextualisés',
            'Configuration du ton et des arguments',
            'Usage intégré au pipeline commercial',
        ],
    },
} as const

type ProPageGateProps = {
    feature: keyof typeof FEATURE_COPY
}

export function ProPageGate({ feature }: ProPageGateProps) {
    const router = useRouter()
    const { agency, role } = useAgency()
    const [isPending, startTransition] = useTransition()
    const copy = FEATURE_COPY[feature]

    function handleUpgrade() {
        if (!agency) return

        if (role !== 'agency_admin') {
            router.push('/app/agency/billing')
            return
        }

        startTransition(async () => {
            const result = await createCheckoutSession(agency.id)
            if ('error' in result) {
                toast.error(result.error)
                return
            }
            window.location.href = result.url
        })
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
            <div className="w-full max-w-4xl rounded-[2rem] border border-border bg-card shadow-sm overflow-hidden">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="p-8 md:p-10">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {feature === 'files' ? <FolderOpen className="h-6 w-6" /> : feature === 'quotes' ? <FileText className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                                <Lock className="h-3.5 w-3.5" />
                                Fonctionnalité PRO
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">{copy.title}</h2>
                            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                                {copy.description}
                            </p>
                        </div>

                        <div className="mt-8 space-y-3">
                            {copy.bullets.map((bullet) => (
                                <div key={bullet} className="flex items-center gap-3 text-sm text-foreground">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <span>{bullet}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={handleUpgrade}
                                disabled={isPending}
                                className="rounded-xl px-5"
                            >
                                {isPending ? 'Redirection...' : role === 'agency_admin' ? 'Passer au plan PRO' : 'Voir la facturation'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/app/agency/billing')}
                                className="rounded-xl px-5"
                            >
                                Voir les détails du plan
                            </Button>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Paiement sécurisé via Stripe. Annulable à tout moment.</span>
                        </div>
                    </div>

                    <div className="border-l border-border bg-muted/30 p-8 md:p-10">
                        <div className="rounded-[1.5rem] border border-border bg-background p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Ce que vous débloquez
                            </p>
                            <div className="mt-5 space-y-4">
                                <div className="rounded-2xl border border-border bg-card p-4">
                                    <p className="text-sm font-semibold text-foreground">Plan PRO</p>
                                    <p className="mt-1 text-2xl font-black text-foreground">39€ / mois</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Projets illimités, équipe, tracking, IA et espace fichiers.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-dashed border-border p-4">
                                    <p className="text-sm font-semibold text-foreground">Pourquoi ici ?</p>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Cette page vous montre exactement la fonctionnalité bloquée au moment où elle devient utile, au lieu de vous renvoyer vers un écran vide.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
