'use client'

import { createContext, useContext, useState, useTransition, ReactNode } from 'react'
import { Zap, FolderKanban, Users, Mail, Sparkles, Globe, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { createCheckoutSession } from '@/actions/billing.server'

type UpgradeDialogState = {
    open: boolean
    reason: string
    agencyId: string
}

type UpgradeDialogContextType = {
    openUpgradeDialog: (reason: string, agencyId: string) => void
}

const UpgradeDialogContext = createContext<UpgradeDialogContextType | null>(null)

export function useUpgradeDialog() {
    const ctx = useContext(UpgradeDialogContext)
    if (!ctx) throw new Error('useUpgradeDialog must be used inside UpgradeDialogProvider')
    return ctx
}

const PRO_FEATURES = [
    { icon: FolderKanban, label: 'Projets illimités' },
    { icon: Users, label: 'Jusqu\'à 5 collaborateurs' },
    { icon: Mail, label: 'Tracking emails illimité' },
    { icon: Sparkles, label: 'Génération de messages IA' },
    { icon: Globe, label: 'Analyse de site web IA' },
]

export function UpgradeDialogProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<UpgradeDialogState>({
        open: false,
        reason: '',
        agencyId: '',
    })
    const [isPending, startTransition] = useTransition()

    function openUpgradeDialog(reason: string, agencyId: string) {
        setState({ open: true, reason, agencyId })
    }

    function handleClose() {
        setState(s => ({ ...s, open: false }))
    }

    function handleUpgrade() {
        startTransition(async () => {
            const result = await createCheckoutSession(state.agencyId)
            if ('error' in result) {
                toast.error(result.error)
            } else {
                window.location.href = result.url
            }
        })
    }

    return (
        <UpgradeDialogContext.Provider value={{ openUpgradeDialog }}>
            {children}

            <Dialog open={state.open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
                    {/* Header gradient */}
                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-8 pt-8 pb-10 text-white overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.3),_transparent_60%)]" />
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>

                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center mb-5">
                                <Zap className="w-6 h-6 text-blue-400 fill-blue-400" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-white leading-tight">
                                Fonctionnalité PRO
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-slate-300 text-sm leading-relaxed">
                                {state.reason}
                            </DialogDescription>
                        </div>

                        {/* Decorative blur */}
                        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
                    </div>

                    {/* Body */}
                    <div className="bg-white px-8 py-6 space-y-6">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                Ce que vous débloquez
                            </p>
                            <ul className="space-y-3">
                                {PRO_FEATURES.map(({ icon: Icon, label }) => (
                                    <li key={label} className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                onClick={handleUpgrade}
                                disabled={isPending}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                {isPending ? 'Redirection...' : 'Passer au Plan PRO — 39 €/mois'}
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-full px-5 py-2.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                            >
                                Plus tard
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </UpgradeDialogContext.Provider>
    )
}
