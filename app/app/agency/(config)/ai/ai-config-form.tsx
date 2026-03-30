"use client"

import { updateAIConfigAction } from "@/actions/ai.server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Brain,
    Coffee,
    Loader2,
    Save,
    Shield, Smile,
    Sparkles,
    UserCircle
} from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { useSettings } from "@/app/app/settings/settings-context"

const TONE_OPTIONS = [
    { label: 'Professionnel', value: 'professional', icon: Shield, desc: 'Sérieux et expert' },
    { label: 'Convivial', value: 'friendly', icon: Smile, desc: 'Chaleureux et proche' },
    { label: 'Formel', value: 'formal', icon: UserCircle, desc: 'Distingué et respectueux' },
    { label: 'Décontracté', value: 'casual', icon: Coffee, desc: 'Simple et direct' }
]

export default function AIConfigForm() {
    const { ai } = useSettings()
    const [selectedTone, setSelectedTone] = useState(ai?.tone || 'professional')
    const [state, formAction, isPending] = useActionState(updateAIConfigAction, null)

    useEffect(() => {
        if (state?.success) toast.success(state.message)
        if (state?.error) toast.error(state.error)
    }, [state])

    return (
        <form action={formAction} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* --- SECTION CERVEAU --- */}
            <Card className="border-border shadow-sm">
                <CardHeader className="bg-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Cerveau de l'Agence</CardTitle>
                            <CardDescription>Donnez à l'IA le contexte nécessaire sur votre agence.</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="context" className="font-bold text-foreground">Contexte général</Label>
                            <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-none text-[10px] uppercase">Identité</Badge>
                        </div>
                        <Textarea
                            id="context"
                            name="context"
                            defaultValue={ai?.ai_context || ""}
                            placeholder="Ex: Agence spécialisée dans le résidentiel haut de gamme à Nantes..."
                            className="min-h-[120px] bg-muted/50 border-border focus-visible:ring-blue-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="keyPoints" className="font-bold text-foreground">Arguments clés (un par ligne)</Label>
                        <Textarea
                            id="keyPoints"
                            name="keyPoints"
                            defaultValue={ai?.key_points || ""}
                            placeholder="- Disponibilité 7j/7&#10;- Visites virtuelles 3D&#10;- Honoraires réduits"
                            className="min-h-[100px] bg-muted/50 border-border focus-visible:ring-blue-600"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* --- SECTION PERSONNALITÉ --- */}
            <Card className="border-border shadow-sm">
                <CardHeader className="bg-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Personnalité & Ton</CardTitle>
                            <CardDescription>Comment l'IA doit-elle s'exprimer auprès des prospects ?</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    <div className="space-y-4">
                        <Label className="font-bold text-foreground">Style de communication</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {TONE_OPTIONS.map((option) => {
                                const Icon = option.icon
                                const active = selectedTone === option.value
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSelectedTone(option.value)}
                                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2
                                            ${active
                                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm'
                                                : 'border-border bg-muted/30 hover:border-border/80'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${active ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-xs font-bold ${active ? 'text-blue-900 dark:text-blue-300' : 'text-foreground'}`}>{option.label}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                        <input type="hidden" name="tone" value={selectedTone} />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="instructions" className="font-bold text-foreground">Instructions particulières</Label>
                        <Textarea
                            id="instructions"
                            name="instructions"
                            defaultValue={ai?.custom_instructions || ""}
                            placeholder="Ex: Toujours terminer par une question ouverte, ne jamais utiliser de jargon technique..."
                            className="bg-muted/50 border-border focus-visible:ring-blue-600"
                        />
                    </div>
                </CardContent>

                <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end gap-3">
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="px-8 font-bold shadow-sm"
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Sauvegarder les réglages
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
