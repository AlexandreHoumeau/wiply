import { fetchSettingsData } from '@/actions/settings.server'
import { SettingsProvider } from '@/app/app/settings/settings-context'

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
    const data = await fetchSettingsData()
    return (
        <SettingsProvider data={data}>
            {children}
        </SettingsProvider>
    )
}
