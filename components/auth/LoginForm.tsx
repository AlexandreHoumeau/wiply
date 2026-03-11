"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
import { useForm } from "react-hook-form";

function GoogleIcon() {
    return (
        <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
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
    const urlError = searchParams.get("error");
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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            posthog.identify(user.id, { email: user.email });
            posthog.capture("user_logged_in", { method: "email" });
        }

        router.push(next || "/app");
        router.refresh();
    }

    async function handleGoogleLogin() {
        setGoogleLoading(true);
        posthog.capture("user_logged_in", { method: "google" });
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
            },
        });
    }

    return (
        <div className="w-full bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_30px_60px_rgba(139,109,248,0.15)] border border-white/50 relative overflow-hidden">
            {/* Brand Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FDE1BA] via-[#E8D2E1] to-[#C1B2FA]" />

            <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] mb-2">
                    Bon retour
                </h1>
                <p className="text-[#7A7A7A] font-medium">
                    Connectez-vous à votre espace <span className="text-[#967CFB] font-bold">Wiply</span>
                </p>
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full h-14 border-[#D1CBFA] bg-white text-[#4C4C4C] font-bold text-base rounded-2xl hover:bg-[#F1EFFD]/50 transition-all shadow-sm mb-6 flex items-center justify-center"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
            >
                {googleLoading ? (
                    <Loader2 className="w-5 h-5 mr-3 animate-spin text-[#967CFB]" />
                ) : (
                    <GoogleIcon />
                )}
                Continuer avec Google
            </Button>

            <div className="relative flex items-center mb-8">
                <div className="flex-grow border-t border-[#F1EFFD]" />
                <span className="flex-shrink-0 mx-4 text-[11px] font-black uppercase tracking-widest text-[#D1CBFA]">OU</span>
                <div className="flex-grow border-t border-[#F1EFFD]" />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {submitError && (
                        <Alert className="border-red-100 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm font-medium ml-1">{submitError}</AlertDescription>
                        </Alert>
                    )}

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="exemple@agence.com"
                                        type="email"
                                        className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C]">Mot de passe</FormLabel>
                                    <Link href="/auth/forgot-password" className="text-xs font-bold text-[#967CFB] hover:underline">
                                        Oublié ?
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D1CBFA] hover:text-[#967CFB]"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <Button
                        className="w-full h-14 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300 mt-4"
                        disabled={loading || googleLoading}
                    >
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Se connecter
                    </Button>
                </form>
            </Form>

            <div className="mt-10 text-center">
                <p className="text-sm font-medium text-[#7A7A7A]">
                    Pas encore de compte ?{" "}
                    <Link
                        href={`/auth/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                        className="text-[#967CFB] font-bold hover:underline"
                    >
                        Créer un espace
                    </Link>
                </p>
            </div>
        </div>
    );
}