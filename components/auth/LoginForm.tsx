"use client";

import { Eye, EyeOff, AlertCircle, Loader2, LockKeyhole } from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

function GoogleIcon() {
    return (
        <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

export function LoginForm() {
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" }
    });
    const supabase = createSupabaseBrowserClient();

    async function onSubmit(values: any) {
        setLoading(true);
        setSubmitError(null);
        const { error } = await supabase.auth.signInWithPassword(values);

        if (error) {
            setSubmitError("Email ou mot de passe incorrect.");
            setLoading(false);
            return;
        }

        router.push(next || "/app");
        router.refresh();
    }

    async function handleGoogleLogin() {
        setGoogleLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
            },
        });
    }

    return (
        <div className="w-full max-w-md relative">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgb(0,0,0,0.4)]">
                {/* Visual Header */}
                <div className="relative px-8 pt-10 pb-12 overflow-hidden text-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="absolute -top-8 -left-8 w-32 h-32 bg-indigo-500/30 rounded-full blur-[40px]" />
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-violet-500/20 rounded-full blur-[40px]" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md mb-4">
                            <LockKeyhole className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Bon retour</h1>
                        <p className="text-sm font-medium text-slate-400">
                            Connectez-vous à votre espace Wiply
                        </p>
                    </div>
                </div>

                {/* Form Body */}
                <div className="px-8 py-8 bg-white relative -mt-4 rounded-t-3xl">
                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-sm mb-5"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading || loading}
                    >
                        {googleLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <GoogleIcon />
                        )}
                        Continuer avec Google
                    </Button>

                    <div className="relative flex items-center mb-5">
                        <div className="flex-grow border-t border-slate-200" />
                        <span className="flex-shrink-0 mx-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ou avec l&apos;email</span>
                        <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {submitError && (
                                <Alert className="py-2.5 px-3 border-red-200 bg-red-50 text-red-600 rounded-xl">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs font-medium ml-1">{submitError}</AlertDescription>
                                </Alert>
                            )}

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-semibold text-slate-700">Adresse email</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="exemple@agence.com"
                                                type="email"
                                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs font-semibold text-slate-700">Mot de passe</FormLabel>
                                            <Link
                                                href="/auth/forgot-password"
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                            >
                                                Mot de passe oublié ?
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="h-11 pr-10 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
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

                            <Button
                                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-900/20 transition-all duration-300 rounded-xl mt-2"
                                disabled={loading || googleLoading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {loading ? "Connexion..." : "Se connecter"}
                            </Button>
                        </form>
                    </Form>
                </div>

                <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        Pas encore de compte ?{" "}
                        <Link
                            href={`/auth/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                            className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                        >
                            Créer un espace
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
