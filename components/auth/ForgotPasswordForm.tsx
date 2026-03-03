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

    if (success) {
        return (
            <div className="w-full max-w-md relative">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgb(0,0,0,0.4)]">
                    <div className="bg-white px-8 py-14 text-center space-y-5">
                        <div className="flex justify-center relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full w-16 h-16 mx-auto" />
                            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm relative z-10">
                                <MailOpen className="w-8 h-8 text-indigo-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Vérifiez vos emails</h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Si un compte existe pour<br />
                                <strong className="text-slate-900">{form.getValues("email")}</strong>,<br />
                                vous recevrez un lien de réinitialisation.
                            </p>
                        </div>
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Retour à la connexion
                        </Link>
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
                    <div className="absolute -top-8 -left-8 w-32 h-32 bg-indigo-500/30 rounded-full blur-[40px]" />
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-violet-500/20 rounded-full blur-[40px]" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md mb-4">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Mot de passe oublié ?</h1>
                        <p className="text-sm font-medium text-slate-400">
                            Entrez votre email pour recevoir un lien de réinitialisation
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
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-semibold text-slate-700">Adresse email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="exemple@agence.com"
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
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isPending ? "Envoi en cours..." : "Envoyer le lien"}
                            </Button>
                        </form>
                    </Form>
                </div>

                <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 text-center">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
}
