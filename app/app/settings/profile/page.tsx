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
import { Switch } from '@/components/ui/switch'
import { useSettings } from '../settings-context'
import { useActionState, useState, useTransition } from 'react'
import { Loader2, CheckCircle2, AlertCircle, User, Lock, Mail, Phone, Briefcase, Sparkles, Bell } from 'lucide-react'
import { updateProfile, updateNotificationPreferences } from '@/actions/profile.server'
import { mapRoleToPosition, NotificationPreferences } from '@/lib/validators/profile'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const NOTIF_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'notify_task_assigned', label: 'Tâche assignée', description: 'Quand une tâche vous est assignée' },
    { key: 'notify_task_comment', label: 'Commentaire sur tâche', description: 'Quand quelqu\'un commente une tâche qui vous concerne' },
    { key: 'notify_opportunity_status', label: 'Changement de statut', description: 'Quand une opportunité change de statut' },
    { key: 'notify_tracking_click', label: 'Lien de tracking cliqué', description: 'Quand un prospect clique sur un lien de tracking' },
    { key: 'notify_portal_submission', label: 'Livrable reçu', description: 'Quand un client soumet un livrable via le portail' },
]

export default function ProfilePage() {
    const { profile } = useSettings()
    const [state, formAction, isPending] = useActionState(updateProfile, null)
    const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
        notify_task_assigned: profile.notify_task_assigned ?? true,
        notify_task_comment: profile.notify_task_comment ?? true,
        notify_opportunity_status: profile.notify_opportunity_status ?? false,
        notify_tracking_click: profile.notify_tracking_click ?? false,
        notify_portal_submission: profile.notify_portal_submission ?? true,
    })
    const [isSavingNotifs, startNotifTransition] = useTransition()

    function handleNotifToggle(key: keyof NotificationPreferences, value: boolean) {
        const updated = { ...notifPrefs, [key]: value }
        setNotifPrefs(updated)
        startNotifTransition(async () => {
            const result = await updateNotificationPreferences(updated)
            if (!result.success) toast.error(result.message)
        })
    }

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
                <Card className="border-border shadow-sm overflow-hidden">
                    <CardHeader className="bg-card border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
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
                                <Label htmlFor="first_name" className="text-foreground">Prénom</Label>
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
                                <Label htmlFor="last_name" className="text-foreground">Nom</Label>
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

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
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
                                <Label htmlFor="position" className="text-foreground flex items-center gap-2">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    Rôle actuel
                                </Label>
                                <div className="px-3 py-2 rounded-md bg-muted border border-border text-sm text-muted-foreground font-medium select-none">
                                    {mapRoleToPosition(profile.role)}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-muted/50 border-t border-border px-6 py-4 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground italic">
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

            <Card className="border-border shadow-sm border-l-4 border-l-blue-400">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-muted rounded-full text-muted-foreground">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground italic">Adresse email du compte</p>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit text-muted-foreground font-normal">
                            Non modifiable
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-card border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-lg">
                            <Bell className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Notifications email</CardTitle>
                            <CardDescription>
                                Choisissez les événements pour lesquels vous souhaitez recevoir un récapitulatif horaire par email.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {NOTIF_OPTIONS.map(({ key, label, description }) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{label}</p>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <Switch
                                checked={notifPrefs[key]}
                                onCheckedChange={(v) => handleNotifToggle(key, v)}
                                disabled={isSavingNotifs}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm opacity-90 transition-opacity hover:opacity-100">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-lg">
                            <Lock className="h-5 w-5 text-muted-foreground" />
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
                            <Label className="text-muted-foreground">Ancien mot de passe</Label>
                            <Input type="password" disabled className="bg-muted/50 cursor-not-allowed border-dashed" placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Nouveau mot de passe</Label>
                            <Input type="password" disabled className="bg-muted/50 cursor-not-allowed border-dashed" placeholder="••••••••" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 border-t border-border px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/40">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-tighter">Bientôt disponible</span>
                    </div>
                    <Button variant="outline" disabled className="text-muted-foreground border-border">
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
