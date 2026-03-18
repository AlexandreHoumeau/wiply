import { fetchSettingsData } from '@/actions/settings.server'
import { SettingsProvider } from './settings-context'
import SettingsNavbar from './settings-navbar' // On importe le nouveau composant

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const data = await fetchSettingsData()

  return (
    <SettingsProvider data={data}>
      <div className="min-h-screen bg-background">
        <div className="max-w-[1000px] mx-auto px-6 py-10">

          {/* Header simplifié */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Paramètres</h1>
          </header>

          {/* Navigation Horizontale */}
          <SettingsNavbar />

          {/* Zone de contenu - Largeur optimisée pour la lecture */}
          <main className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {children}
          </main>

        </div>
      </div>
    </SettingsProvider>
  )
}