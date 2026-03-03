"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import InviteAcceptanceButton from "./_components/invite-acceptance-button"

export default async function InvitePage({
    searchParams,
}: {
    searchParams: Promise<{ token: string }>
}) {
    const { token } = await searchParams;

    // Page publique — pas besoin d'être connecté pour voir l'invitation.
    // L'authentification est vérifiée uniquement au moment d'accepter.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: invite, error } = await supabaseAdmin
        .from('agency_invites')
        .select('*, agencies(name)')
        .eq('token', token)
        .single()

    // Debugging (vérifie tes logs serveur, pas navigateur)
    if (error) console.error("Erreur invitation:", error.message);

    // 3. Validation de l'invitation
    if (!invite || invite.accepted || new Date(invite.expires_at) < new Date()) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center py-8">
                    <CardContent className="space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle>Lien invalide</CardTitle>
                        <CardDescription>
                            Cette invitation n'existe pas, a expiré ou a déjà été acceptée.
                        </CardDescription>
                        <Button asChild className="mt-4">
                            <Link href="/">Retour à l'accueil</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <Card className="max-w-md p-0 w-full shadow-xl border-none overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 h-2 w-full" />
                <CardHeader className="text-center pt-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
                        <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Invitation reçue</CardTitle>
                    <CardDescription className="text-base pt-2">
                        Vous avez été invité à rejoindre l'agence <br />
                        <span className="font-semibold text-slate-900 underline decoration-blue-500 decoration-2 underline-offset-4">
                            {invite.agencies?.name}
                        </span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 px-8">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            <p className="text-slate-600">Accès au tableau de bord collaboratif</p>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            <p className="text-slate-600">Rôle : <span className="font-medium capitalize">{invite.role.replace('agency_', '')}</span></p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-8 pt-4">
                    <InviteAcceptanceButton
                        token={token}
                        isLoggedIn={!!user}
                        userEmail={user?.email ?? null}
                        inviteEmail={invite.email}
                    />
                </CardFooter>
            </Card>
        </div>
    )
}