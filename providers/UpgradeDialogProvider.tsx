'use client'

import { createContext, useContext, useState, useTransition, ReactNode } from 'react'
import { Zap, FolderKanban, Users, Mail, Sparkles, Globe, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { createCheckoutSession } from '@/actions/billing.server'
import { cn } from '@/lib/utils'

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
        if (isPending) return // Prevent closing while processing
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
                <DialogContent className="sm:max-w-[420px] p-6 gap-6 rounded-[2rem] border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                    
                    {/* Decorative Background Blob */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Custom Close Button */}
                    {/* <button
                        onClick={handleClose}
                        disabled={isPending}
                        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button> */}

                    {/* Header Section */}
                    <div className="flex flex-col items-center text-center mt-4 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-6 ring-4 ring-indigo-500/10">
                            <Zap className="w-8 h-8 text-white fill-white/20" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground mb-2">
                            Passez au niveau supérieur
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                            {state.reason || "Débloquez toute la puissance de notre plateforme."}
                        </DialogDescription>
                    </div>

                    {/* Features Card */}
                    <div className="bg-muted/40 border border-border/50 rounded-2xl p-5 relative z-10">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
                            Inclus dans le plan Pro
                        </p>
                        <ul className="space-y-3.5">
                            {PRO_FEATURES.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        {label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA Section */}
                    <div className="space-y-3 relative z-10">
                        <button
                            onClick={handleUpgrade}
                            disabled={isPending}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-5 h-12 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-xl transition-all duration-200",
                                "hover:from-indigo-600 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-500/25",
                                "active:scale-[0.98]",
                                "disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                            )}
                        >
                            {isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Redirection sécurisée...
                                </>
                            ) : (
                                <>
                                    Débloquer Pro — 39 €/mois
                                </>
                            )}
                        </button>
                        
                        {/* Trust Signal */}
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Paiement sécurisé. Annulable à tout moment.</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </UpgradeDialogContext.Provider>
    )
}
