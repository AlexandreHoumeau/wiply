'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createCheckoutSession, createPortalSession } from '@/actions/billing.server'
import posthog from 'posthog-js'
import { PLANS } from '@/lib/config/plans'
import {
    Check,
    Sparkles,
    Zap,
    Users,
    ArrowUpRight,
    CreditCard,
    Mail,
    Layout,
    HelpCircle
} from 'lucide-react'

type BillingData = {
    plan: 'FREE' | 'PRO'
    subscription_status: string | null
    stripe_customer_id: string | null
    project_count: number
    member_count: number
}

// --- SOUS-COMPOSANTS ---

function UsageBar({ label, current, max, icon: Icon }: {
    label: string;
    current: number;
    max: number | typeof Infinity;
    icon: any
}) {
    const isUnlimited = max === Infinity
    const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
    const isNearLimit = !isUnlimited && percentage >= 80

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Icon className="w-4 h-4 text-slate-400" />
                    {label}
                </div>
                <span className="text-sm font-bold text-slate-900">
                    {current} <span className="text-slate-400 font-medium">/ {isUnlimited ? '∞' : max}</span>
                </span>
            </div>
            {!isUnlimited ? (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            ) : (
                <div className="h-2 bg-blue-50 rounded-full border border-blue-100/50 flex items-center px-1">
                    <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-30" />
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string | null }) {
    const config: Record<string, { label: string; className: string; dot: string }> = {
        active: { label: 'Abonnement actif', className: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
        trialing: { label: 'Période d\'essai', className: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
        past_due: { label: 'Incident de paiement', className: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
        canceled: { label: 'Annulé', className: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
        inactive: { label: 'Inactif', className: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-300' },
    }
    const badge = config[status ?? 'inactive'] ?? config.inactive
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
        </span>
    )
}

// --- COMPOSANT PRINCIPAL ---

export function BillingStatus({ billing, agencyId }: { billing: BillingData; agencyId: string }) {
    const [isPending, startTransition] = useTransition()
    const isFree = billing.plan === 'FREE'
    const planLimits = PLANS[billing.plan]

    function handleUpgrade() {
        posthog.capture("upgrade_to_pro_clicked", { agency_id: agencyId });
        startTransition(async () => {
            const result = await createCheckoutSession(agencyId)
            if ('error' in result) {
                toast.error(result.error)
            } else {
                window.location.href = result.url
            }
        })
    }

    function handleManage() {
        posthog.capture("billing_portal_opened", { agency_id: agencyId });
        startTransition(async () => {
            const result = await createPortalSession(agencyId)
            if ('error' in result) {
                toast.error(result.error)
            } else {
                window.location.href = result.url
            }
        })
    }

    return (
        <div className="max-w-5xl space-y-8">
            {/* SECTION ABONNEMENT */}
            <div className="relative overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm transition-all hover:shadow-md">
                {/* Badge décoratif pour les membres PRO */}
                {!isFree && (
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <div className="bg-blue-600/10 text-blue-600 p-2 rounded-full backdrop-blur-sm">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </div>
                )}

                <div className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-3">
                            <StatusBadge status={billing.subscription_status} />
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                                    Plan {isFree ? 'Free' : 'Pro'}
                                </h3>
                                <p className="text-slate-500 mt-2 max-w-md">
                                    {isFree
                                        ? "Vous utilisez actuellement la version gratuite. Idéal pour tester nos outils de base."
                                        : "Vous profitez de la puissance totale de Wiply pour votre agence."}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[240px]">
                            {isFree ? (
                                <button
                                    onClick={handleUpgrade}
                                    disabled={isPending}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Zap className="w-4 h-4 fill-current" />
                                    {isPending ? 'Redirection...' : 'Passer au Plan PRO — 39€'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleManage}
                                    disabled={isPending}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-4 border border-slate-200 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    {isPending ? 'Chargement...' : 'Gérer ma facturation'}
                                </button>
                            )}
                            <p className="text-[11px] text-center text-slate-400">
                                Paiement sécurisé via Stripe &bull; Facture HT/TTC
                            </p>
                        </div>
                    </div>

                    {/* Features Grid si Free */}
                    {isFree && (
                        <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'Projets Illimités', icon: Layout },
                                { title: '5 Collaborateurs', icon: Users },
                                { title: 'Tracking Emails', icon: Mail },
                                { title: 'IA Mistral', icon: Sparkles },
                            ].map((f) => (
                                <div key={f.title} className="flex items-center gap-3">
                                    <div className="p-1.5 bg-emerald-50 rounded-md">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{f.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION USAGE & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Jauges d'utilisation */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Utilisation des ressources</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" />
                            Temps réel
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <UsageBar
                            label="Projets créés"
                            current={billing.project_count}
                            max={planLimits.max_projects}
                            icon={Layout}
                        />
                        <UsageBar
                            label="Équipe (Membres)"
                            current={billing.member_count}
                            max={planLimits.max_members}
                            icon={Users}
                        />
                        <UsageBar
                            label="Tracking Emails"
                            current={0}
                            max={planLimits.max_tracking_emails_per_month}
                            icon={Mail}
                        />
                        <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-xl">
                            <p className="text-[11px] text-slate-400 text-center italic">
                                D&apos;autres statistiques arrivent bientôt (Stockage, API...)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bloc Support / Aide */}
                <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                <HelpCircle className="w-6 h-6 text-blue-400" />
                            </div>
                            <h4 className="text-xl font-bold">Un doute ?</h4>
                            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                                Vous avez une question sur la facturation ou besoin d&apos;un plan sur mesure pour votre agence ?
                            </p>
                        </div>
                        <button className="mt-8 flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-all group-hover:translate-x-1">
                            Contacter l&apos;assistance <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Décoration d'arrière-plan */}
                    <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-blue-600/20 rounded-full blur-[60px]" />
                </div>
            </div>
        </div>
    )
}