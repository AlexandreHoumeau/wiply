'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log de l'erreur critique
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#FFFDF8] px-6 text-center overflow-hidden">
          {/* Background Background (Matches Hero) */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#EBF0FE] via-[#F1EFFD] to-[#FFFDF8] z-0" />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-lg w-full"
          >
            {/* Error Icon Container */}
            <div className="flex justify-center mb-10">
                <div className="p-7 rounded-[2.5rem] bg-white border border-[#FDE1BA] shadow-[0_20px_40px_rgba(139,109,248,0.1)] relative">
                    <AlertTriangle className="w-14 h-14 text-[#967CFB]" strokeWidth={1.5} />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#FAD9A1] rounded-full flex items-center justify-center border-4 border-white">
                        <span className="text-white text-xs font-black">!</span>
                    </div>
                </div>
            </div>

            <h1 className="text-4xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-tight mb-6 leading-[0.95]">
                Une erreur inattendue <br /> est survenue
            </h1>

            <p className="text-[#7A7A7A] font-medium text-lg sm:text-xl leading-relaxed mb-12 max-w-md mx-auto">
                Même les meilleurs OS ont besoin d'un petit redémarrage. Pas de panique, on s'occupe de tout.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={reset}
                className="h-14 px-10 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300 flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCcw className="w-5 h-5" />
                Réessayer
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                className="h-14 px-8 border-[#D1CBFA] text-[#7A7A7A] font-bold text-lg rounded-2xl hover:bg-[#F1EFFD]/50 transition-all bg-white w-full sm:w-auto flex items-center gap-2"
              >
                <Link href="/">
                    <Home className="w-5 h-5" />
                    Retour à l&apos;accueil
                </Link>
              </Button>
            </div>

            {/* Error ID Badge */}
            <div className="mt-16 inline-flex items-center px-4 py-1.5 rounded-full border border-[#D1CBFA] bg-white/50 text-[10px] font-black uppercase tracking-widest text-[#967CFB]">
                ID : {error.digest || 'CRITICAL_SYSTEM_ERROR'}
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  )
}