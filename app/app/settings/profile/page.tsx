'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSettings } from '../settings-context'
import { useActionState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, User, Lock, Mail, Phone, Briefcase, Sparkles } from 'lucide-react'
import { updateProfile } from '@/actions/profile.server'
import { mapRoleToPosition } from '@/lib/validators/profile'
import { Separator } from '@/components/ui/separator'

export default function ProfilePage() {
    const { profile } = useSettings()
    const [state, formAction, isPending] = useActionState(updateProfile, null)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {state?.message && (
                <Alert variant={state.success ? "default" : "destructive"} className="shadow-sm border-2">
                    {state.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="font-medium">
                        {state.message}
                    </AlertDescription>
                </Alert>
            )}

            <form action={formAction}>
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Informations personnelles</CardTitle>
                                <CardDescription>
                                    Mettez à jour votre identité et vos coordonnées professionnelles.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-slate-700">Prénom</Label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    defaultValue={profile.first_name}
                                    placeholder="Jean"
                                    disabled={isPending}
                                    className="focus-visible:ring-blue-500"
                                />
                                {state?.errors?.first_name && (
                                    <p className="text-xs text-destructive font-medium">{state.errors.first_name[0]}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-slate-700">Nom</Label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    defaultValue={profile.last_name}
                                    placeholder="Dupont"
                                    disabled={isPending}
                                    className="focus-visible:ring-blue-500"
                                />
                                {state?.errors?.last_name && (
                                    <p className="text-xs text-destructive font-medium">{state.errors.last_name[0]}</p>
                                )}
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-700 flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    Téléphone
                                </Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    defaultValue={profile.phone}
                                    placeholder="+33 6 00 00 00 00"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2 uppercase tracking-wide">
                                <Label htmlFor="position" className="text-slate-700 flex items-center gap-2">
                                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                    Rôle actuel
                                </Label>
                                <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-500 font-medium select-none">
                                    {mapRoleToPosition(profile.role)}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
                        <span className="text-xs text-slate-400 italic">
                            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
                        </span>
                        <Button type="submit" disabled={isPending} className="shadow-sm transition-all active:scale-95">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                'Enregistrer les modifications'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-400">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-full text-slate-500">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 italic">Adresse email du compte</p>
                                <p className="text-sm text-slate-500">{profile.email}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit text-slate-500 font-normal">
                            Non modifiable
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm opacity-90 transition-opacity hover:opacity-100">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Lock className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg italic">Sécurité & Mot de passe</CardTitle>
                            <CardDescription>
                                Protégez votre compte en utilisant un mot de passe robuste.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 pt-0">
                    <div className="grid grid-cols-1 gap-4 max-w-md">
                        <div className="space-y-2">
                            <Label className="text-slate-400">Ancien mot de passe</Label>
                            <Input type="password" disabled className="bg-slate-50/50 cursor-not-allowed border-dashed" placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400">Nouveau mot de passe</Label>
                            <Input type="password" disabled className="bg-slate-50/50 cursor-not-allowed border-dashed" placeholder="••••••••" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-tighter">Bientôt disponible</span>
                    </div>
                    <Button variant="outline" disabled className="text-slate-400 border-slate-200">
                        Changer le mot de passe
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

/** Composant Badge simple si non importé */
function Badge({ children, className }: any) {
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {children}
        </span>
    )
}