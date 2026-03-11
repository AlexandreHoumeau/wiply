"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Loader2, Mail, MailOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { resetPasswordForEmail } from "@/actions/auth.actions";
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

const schema = z.object({
    email: z.string().email("Email invalide"),
});

export function ForgotPasswordForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });

    async function onSubmit(values: { email: string }) {
        setError(null);
        setIsPending(true);

        const { error } = await resetPasswordForEmail(values.email)
        if (error) {
            setError(error);
        } else {
            setSuccess(true);
        }
        setIsPending(false);
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
                    Lien envoyé !
                </h2>
                <p className="text-[#7A7A7A] font-medium leading-relaxed mb-8">
                    Si un compte existe pour <br />
                    <strong className="text-[#4C4C4C]">{form.getValues("email")}</strong>, <br />
                    vous recevrez un lien de réinitialisation sous peu.
                </p>
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-[#967CFB] font-bold hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                </Link>
            </div>
        );
    }

    // --- MAIN FORM ---
    return (
        <div className="w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_rgba(139,109,248,0.15)] border border-white/50 relative overflow-hidden">
            {/* Top Gradient Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FDE1BA] via-[#E8D2E1] to-[#C1B2FA]" />

            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-[#F1EFFD] mb-4">
                    <Mail className="w-5 h-5 text-[#967CFB]" />
                </div>
                <h1 className="text-3xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-tight mb-2">
                    Mot de passe oublié ?
                </h1>
                <p className="text-[#7A7A7A] font-medium">
                    Entrez votre email pour recevoir <br className="hidden sm:block" /> un lien de réinitialisation.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {error && (
                        <Alert className="border-red-100 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm font-medium ml-1">{error}</AlertDescription>
                        </Alert>
                    )}

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Adresse email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="exemple@agence.com"
                                        className="h-12 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl px-4 text-[#4C4C4C]"
                                        disabled={isPending}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-full h-14 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300"
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {isPending ? "Envoi..." : "Envoyer le lien"}
                    </Button>
                </form>
            </Form>

            <div className="mt-10 text-center">
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#967CFB] hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                </Link>
            </div>
        </div>
    );
}