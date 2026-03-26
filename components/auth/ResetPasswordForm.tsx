"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
});

export function ResetPasswordForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();

        // Implicit flow: tokens arrive in the URL hash (#access_token=...&refresh_token=...)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ error }) => {
                    if (error) setError('Lien invalide ou expiré.');
                    else setSessionReady(true);
                });
        } else {
            // PKCE flow: session already established by /auth/callback route
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) setSessionReady(true);
                else setError('Lien invalide ou expiré.');
            });
        }
    }, []);

    async function onSubmit(values: { password: string; confirmPassword: string }) {
        setError(null);
        setIsPending(true);
        const supabase = createSupabaseBrowserClient();
        const { error: authError } = await supabase.auth.updateUser({ password: values.password });
        if (authError) {
            setError(authError.message);
            setIsPending(false);
            return;
        }
        setSuccess(true);
        setTimeout(() => router.push("/app"), 2000);
    }

    if (success) {
        return (
            <div className="w-full max-w-md relative">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgb(0,0,0,0.4)]">
                    <div className="bg-white px-8 py-14 text-center space-y-5">
                        <div className="flex justify-center relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full w-16 h-16 mx-auto" />
                            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm relative z-10">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mot de passe mis à jour !</h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Votre mot de passe a été changé avec succès.<br />
                                Redirection vers l&apos;application...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md relative">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgb(0,0,0,0.4)]">
                {/* Visual Header */}
                <div className="relative px-8 pt-10 pb-12 overflow-hidden text-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/30 rounded-full blur-[40px]" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-violet-500/20 rounded-full blur-[40px]" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md mb-4">
                            <KeyRound className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Nouveau mot de passe</h1>
                        <p className="text-sm font-medium text-slate-400">
                            Choisissez un mot de passe fort (8 caractères minimum)
                        </p>
                    </div>
                </div>

                {/* Form Body */}
                <div className="px-8 py-8 bg-white relative -mt-4 rounded-t-3xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                                <Alert className="py-2.5 px-3 border-red-200 bg-red-50 text-red-600 rounded-xl">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs font-medium ml-1">{error}</AlertDescription>
                                </Alert>
                            )}

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-semibold text-slate-700">Nouveau mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    spellCheck={false}
                                                    className="h-11 pr-10 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                    disabled={isPending}
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-semibold text-slate-700">Confirmer le mot de passe</FormLabel>
                                        <FormControl>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                spellCheck={false}
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                disabled={isPending}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-900/20 transition-all duration-300 rounded-xl mt-2"
                                disabled={isPending || !sessionReady}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isPending ? "Mise à jour..." : "Changer le mot de passe"}
                            </Button>
                        </form>
                    </Form>
                </div>

                <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 text-center">
                    <Link
                        href="/auth/login"
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
}
