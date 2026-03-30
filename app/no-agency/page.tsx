import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function NoAgencyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

    if (profile?.agency_id) {
        redirect("/app");
    }

    const { data: pendingInvite } = await supabaseAdmin
        .from("agency_invites")
        .select("token, agencies(name)")
        .eq("email", user.email!)
        .eq("accepted", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    const invitedAgencyName = Array.isArray(pendingInvite?.agencies)
        ? pendingInvite.agencies[0]?.name ?? null
        : pendingInvite?.agencies?.name ?? null;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-lg border-slate-200">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <Building2 className="h-7 w-7 text-slate-700" />
                    </div>
                    <CardTitle>Vous n&apos;avez plus d&apos;agence active</CardTitle>
                    <CardDescription>
                        Votre compte existe toujours, mais vous ne faites actuellement partie d&apos;aucune agence.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                    <p>
                        Vous pouvez toujours vous connecter avec ce compte. Pour retravailler dans un espace d&apos;agence,
                        vous devez accepter une nouvelle invitation ou créer une nouvelle agence.
                    </p>
                    {pendingInvite ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                            Une invitation en attente a ete trouvee
                            {invitedAgencyName ? ` pour ${invitedAgencyName}` : ""}.
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            Aucune invitation en attente n&apos;a ete trouvee pour {user.email}.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 sm:flex-row">
                    {pendingInvite ? (
                        <Button asChild className="w-full sm:flex-1">
                            <Link href={`/invite?token=${pendingInvite.token}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Voir l&apos;invitation
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild className="w-full sm:flex-1">
                            <Link href="/onboarding">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Creer une agence
                            </Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" className="w-full sm:flex-1">
                        <Link href="/">Retour a l&apos;accueil</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
