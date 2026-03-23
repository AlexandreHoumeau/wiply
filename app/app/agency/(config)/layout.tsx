import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AgencyConfigNavbar from './agency-config-navbar'

export default function AgencyConfigLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[1000px] mx-auto px-6 py-10">

                <header className="mb-8">
                    <Link
                        href="/app/agency"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Agence
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Paramètres de l&apos;agence</h1>
                </header>

                <AgencyConfigNavbar />

                <main className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {children}
                </main>

            </div>
        </div>
    )
}
