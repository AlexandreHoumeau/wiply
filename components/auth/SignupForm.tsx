"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, AlertCircle, Loader2, Sparkles, MailOpen } from "lucide-react";
import { z } from "zod";
import Link from "next/link";

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

import { signupSchema } from "@/lib/validators/auth";
import { signup } from "@/actions/auth.actions";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignupValues = z.infer<typeof signupSchema>;

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

export function SignupForm() {
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const isInvited = !!next;

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            isInvited: isInvited,
            agencyName: "",
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    function onSubmit(values: SignupValues) {
        setError(null);
        startTransition(async () => {
            const result = await signup({ ...values, redirectTo: next || undefined });
            if (result?.error) {
                setError(result.error);
                return;
            }
            setSuccess(true);
        });
    }

    async function handleGoogleSignup() {
        setGoogleLoading(true);
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
            },
        });
    }

    // --- SUCCESS STATE ---
    if (success) {
        return (
            <div className="w-full bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_30px_60px_rgba(139,109,248,0.15)] border border-white/50 text-center">
                 <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-3xl bg-[#F1EFFD] border border-[#D1CBFA] shadow-sm">
                        <MailOpen className="w-10 h-10 text-[#967CFB]" />
                    </div>
                </div>
                <h2 className="text-3xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-tight mb-4">
                    Vérifiez vos emails
                </h2>
                <p className="text-[#7A7A7A] font-medium leading-relaxed">
                    Un lien magique a été envoyé à <br />
                    <strong className="text-[#4C4C4C]">{form.getValues("email")}</strong>. <br />
                    Cliquez dessus pour activer votre espace.
                </p>
            </div>
        );
    }

    // --- MAIN FORM ---
    return (
        <div className="w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_rgba(139,109,248,0.15)] border border-white/50 relative overflow-hidden">
            {/* Top Gradient Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FDE1BA] via-[#E8D2E1] to-[#C1B2FA]" />

            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-[#F1EFFD] mb-4">
                    <Sparkles className="w-5 h-5 text-[#967CFB]" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] mb-2">
                    {isInvited ? "Rejoindre l'équipe" : "Commencer l'aventure"}
                </h1>
                <p className="text-[#7A7A7A] font-medium text-sm">
                    {isInvited ? "Créez votre profil pour collaborer" : "Créez votre espace de travail en 2 minutes"}
                </p>
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full h-14 border-[#D1CBFA] bg-white text-[#4C4C4C] font-bold text-base rounded-2xl hover:bg-[#F1EFFD]/50 transition-all shadow-sm mb-6 flex items-center justify-center"
                onClick={handleGoogleSignup}
                disabled={googleLoading || isPending}
            >
                {googleLoading ? (
                    <Loader2 className="w-5 h-5 mr-3 animate-spin text-[#967CFB]" />
                ) : (
                    <GoogleIcon />
                )}
                {isInvited ? "Rejoindre avec Google" : "Continuer avec Google"}
            </Button>

            <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-[#F1EFFD]" />
                <span className="flex-shrink-0 mx-4 text-[11px] font-black uppercase tracking-widest text-[#D1CBFA]">OU</span>
                <div className="flex-grow border-t border-[#F1EFFD]" />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <Alert className="border-red-100 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm font-medium ml-1">{error}</AlertDescription>
                        </Alert>
                    )}

                    <input type="hidden" {...form.register("isInvited")} />

                    {!isInvited && (
                        <FormField
                            control={form.control}
                            name="agencyName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Nom de l&apos;agence</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Acme Studio"
                                            className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Prénom</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Jean"
                                            autoComplete="given-name"
                                            className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Nom</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Dupont"
                                            autoComplete="family-name"
                                            className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Adresse email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="jean@agence.com"
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                        disabled={isPending}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                spellCheck={false}
                                                className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl pl-4 pr-10 text-[#4C4C4C]"
                                                disabled={isPending}
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
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Confirmation</FormLabel>
                                    <FormControl>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300 mt-4"
                        disabled={isPending || googleLoading}
                    >
                        {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {isPending ? "Création..." : "Créer mon espace"}
                    </Button>
                </form>
            </Form>

            <div className="mt-8 text-center">
                <p className="text-sm font-medium text-[#7A7A7A]">
                    Déjà inscrit ?{" "}
                    <Link
                        href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                        className="text-[#967CFB] font-bold hover:underline"
                    >
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}
