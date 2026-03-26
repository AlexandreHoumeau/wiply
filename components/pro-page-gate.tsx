'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURE_COPY = {
    quotes: {
        description: 'Créez des propositions commerciales professionnelles avec le plan PRO.',
    },
    ai: {
        description: "Configurez et utilisez l'agent IA avec le plan PRO.",
    },
} as const

type ProPageGateProps = {
    feature: keyof typeof FEATURE_COPY
}

export function ProPageGate({ feature }: ProPageGateProps) {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
                <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-semibold tracking-tight">Fonctionnalité PRO</h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {FEATURE_COPY[feature].description}
                </p>
            </div>
            <Button
                size="sm"
                onClick={() => router.push('/app/agency/billing')}
                className="rounded-full px-5"
            >
                Passer au plan PRO
            </Button>
        </div>
    )
}
