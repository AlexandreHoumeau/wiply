import { Wand2 } from "lucide-react"
import AIConfigForm from "./ai-config-form"
import { ProPageGate } from "@/components/pro-page-gate"
import { fetchSettingsData } from "@/actions/settings.server"
import { isProPlan } from "@/lib/validators/agency"

export default async function AISettingsPage() {
    const { agency } = await fetchSettingsData()

    if (!isProPlan(agency)) {
        return <ProPageGate feature="ai" />
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Intelligence Artificielle</h1>
                </div>
                <p className="text-slate-500 text-sm">Configurez la "voix" et les connaissances de votre agence digitale.</p>
            </div>

            <AIConfigForm />
        </div>
    )
}
