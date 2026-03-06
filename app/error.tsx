'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-6 text-center">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-3xl mb-2">Une erreur est survenue</h1>
      <p className="text-slate-400 mb-8 max-w-md">
        Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" className="bg-white text-slate-950 hover:bg-slate-200">
          Réessayer
        </Button>
        <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  )
}
