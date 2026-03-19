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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useSettings } from '../settings-context'
import { useActionState, useState, useTransition } from 'react'
import { Loader2, CheckCircle2, AlertCircle, User, Lock, Mail, Phone, Briefcase, Bell, Download, Trash2, ShieldAlert, KeyRound } from 'lucide-react'
import { updateProfile, updateNotificationPreferences } from '@/actions/profile.server'
import { deleteAccount, exportAccountData } from '@/actions/account.server'
import { mapRoleToPosition, NotificationPreferences } from '@/lib/validators/profile'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const NOTIF_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'notify_task_assigned', label: 'Tâche assignée', description: 'Quand une tâche vous est assignée' },
    { key: 'notify_task_comment', label: 'Commentaire sur tâche', description: 'Quand quelqu\'un commente une tâche' },
    { key: 'notify_opportunity_status', label: 'Changement de statut', description: 'Quand une opportunité évolue' },
    { key: 'notify_tracking_click', label: 'Lien de tracking', description: 'Quand un prospect clique sur un lien' },
    { key: 'notify_portal_submission', label: 'Livrable reçu', description: 'Soumission client via le portail' },
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

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteEmailInput, setDeleteEmailInput] = useState('')
    const [isDeleting, startDeleteTransition] = useTransition()
    const [isExporting, startExportTransition] = useTransition()

    function handleExport() {
        startExportTransition(async () => {
            const result = await exportAccountData()
            if (!result.success || !result.data) {
                toast.error(result.message ?? "Erreur lors de l'export")
                return
            }
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Export prêt")
        })
    }

    function handleDeleteAccount() {
        startDeleteTransition(async () => {
            const result = await deleteAccount(deleteEmailInput)
            if (!result.success) {
                toast.error(result.message)
                return
            }
            setDeleteDialogOpen(false)
            window.location.href = '/auth/login?deleted=true'
        })
    }

    function handleNotifToggle(key: keyof NotificationPreferences, value: boolean) {
        const updated = { ...notifPrefs, [key]: value }
        setNotifPrefs(updated)
        startNotifTransition(async () => {
            const result = await updateNotificationPreferences(updated)
            if (!result.success) toast.error(result.message)
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {state?.message && (
                <Alert variant={state.success ? "default" : "destructive"} className="border-2">
                    {state.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}

            {/* Profil & Coordonnées */}
            <form action={formAction}>
                <Card className='pb-0'>
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-6">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>Profil</CardTitle>
                            <CardDescription>Informations visibles sur la plateforme</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">Prénom</Label>
                                <Input id="first_name" name="first_name" defaultValue={profile.first_name} disabled={isPending} />
                                {state?.errors?.first_name && <p className="text-xs text-destructive">{state.errors.first_name[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Nom</Label>
                                <Input id="last_name" name="last_name" defaultValue={profile.last_name} disabled={isPending} />
                                {state?.errors?.last_name && <p className="text-xs text-destructive">{state.errors.last_name[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-3 w-3" /> Téléphone</Label>
                                <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} disabled={isPending} />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> Rôle</Label>
                                <div className="h-10 px-3 flex items-center rounded-md bg-muted text-sm font-medium border">
                                    {mapRoleToPosition(profile.role)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/30 py-3 flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            {/* Compte & Sécurité */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle>Compte & Sécurité</CardTitle>
                        <CardDescription>Gérez vos identifiants de connexion</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Adresse email</p>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                            </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-1 rounded">Lecture seule</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-dashed opacity-60">
                        <div className="flex items-center gap-3">
                            <KeyRound className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Mot de passe</p>
                                <p className="text-xs text-muted-foreground">Modifier votre mot de passe (Prochainement)</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>Modifier</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-600">
                        <Bell className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>Recevez un récapitulatif par email</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {NOTIF_OPTIONS.map(({ key, label, description }) => (
                        <div key={key} className="flex items-center justify-between gap-4 p-1">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">{label}</p>
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

            {/* Danger Zone */}
            <Card className="border-destructive/20 shadow-none bg-destructive/[0.02]">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="p-2.5 bg-destructive/10 rounded-xl text-destructive">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-destructive">Actions sensibles</CardTitle>
                        <CardDescription>Exportation des données et suppression</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
                        <div>
                            <p className="text-sm font-medium">Portabilité des données (RGPD)</p>
                            <p className="text-xs text-muted-foreground">Télécharger une copie de vos données au format JSON.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            Exporter
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-destructive/20">
                        <div>
                            <p className="text-sm font-medium text-destructive">Suppression définitive</p>
                            <p className="text-xs text-muted-foreground">Effacer votre compte et vos données personnelles.</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => { setDeleteEmailInput(''); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Êtes-vous absolument sûr ?</DialogTitle>
                        <DialogDescription className="pt-2">
                            Cette action est irréversible. Si vous êtes le seul administrateur, l'agence sera également supprimée.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <Label htmlFor="confirm-email">Saisissez <b>{profile.email}</b> pour confirmer</Label>
                        <Input
                            id="confirm-email"
                            placeholder={profile.email}
                            value={deleteEmailInput}
                            onChange={(e) => setDeleteEmailInput(e.target.value)}
                            className="border-destructive/50 focus-visible:ring-destructive"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteEmailInput.trim() !== profile.email}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Supprimer définitivement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}