'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[70vh] px-6 text-center bg-[#FFFDF8]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full"
      >
        {/* Bubbly Icon Container */}
        <div className="flex justify-center mb-8">
          <div className="p-6 rounded-[2rem] bg-[#FFF0E6] border border-[#FDE1BA] shadow-sm relative">
            <AlertTriangle className="w-12 h-12 text-[#FAD9A1]" strokeWidth={2.5} />
            {/* Petit badge décoratif */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#967CFB] rounded-full animate-pulse" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-tight mb-4">
          Oups, petit bug !
        </h1>

        <p className="text-[#7A7A7A] font-medium text-lg leading-relaxed mb-10">
          Quelque chose s&apos;est mal passé de notre côté. Pas d&apos;inquiétude, vos données sont en sécurité.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={reset}
            className="h-14 px-10 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            Réessayer
          </Button>

          <Button
            variant="outline"
            asChild
            className="h-14 px-8 border-[#D1CBFA] text-[#7A7A7A] font-bold text-lg rounded-2xl hover:bg-[#F1EFFD]/50 transition-all"
          >
            <a href="mailto:support@wiply.app">Contact</a>
          </Button>
        </div>

        <p className="mt-12 text-[11px] font-black uppercase tracking-widest text-[#D1CBFA]">
          Code d&apos;erreur : {error.digest || 'UNKNOWN_ERROR'}
        </p>
      </motion.div>
    </div>
  )
}