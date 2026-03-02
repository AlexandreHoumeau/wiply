import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="px-6 lg:px-10 h-16 flex items-center border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span>Wiply</span>
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600 transition-colors">← Retour à l&apos;accueil</Link>
      </footer>
    </div>
  )
}
