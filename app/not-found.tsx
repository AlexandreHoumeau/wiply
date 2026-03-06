import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-6 text-center">
      <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4">
        404
      </p>
      <h1 className="text-2xl mb-2">Page introuvable</h1>
      <p className="text-slate-400 mb-8 max-w-md">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex gap-3">
        <Button asChild className="bg-white text-slate-950 hover:bg-slate-200 font-semibold">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link href="/app">Mon espace</Link>
        </Button>
      </div>
    </div>
  )
}
