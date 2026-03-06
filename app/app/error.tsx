'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AppError({
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
    <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[60vh] px-6 text-center">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-2xl text-slate-900 mb-2">Une erreur est survenue</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        Quelque chose s&apos;est mal passé. Réessayez ou contactez le support si le problème persiste.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}
