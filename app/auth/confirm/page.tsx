import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ConfirmEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
    const { token_hash, type, next } = await searchParams;

    const callbackUrl = token_hash && type
        ? `/auth/callback?token_hash=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(type)}${next ? `&next=${encodeURIComponent(next)}` : ""}`
        : "/auth/login";

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden px-4 py-12">
            <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgb(0,0,0,0.4)]">
                    <div className="px-8 py-14 text-center bg-white space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                                <MailCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Confirmez votre adresse email
                            </h1>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Cliquez sur le bouton ci-dessous pour activer votre compte Wiply.
                            </p>
                        </div>
                        <Button
                            asChild
                            className="w-full h-12 text-sm font-bold bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 shadow-lg rounded-xl"
                        >
                            <Link href={callbackUrl}>
                                Confirmer mon adresse email
                            </Link>
                        </Button>
                        <p className="text-xs text-slate-400">
                            Ce lien est à usage unique et expire dans 24 heures.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
