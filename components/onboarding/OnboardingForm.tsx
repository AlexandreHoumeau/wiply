"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Building2, Loader2, Sparkles } from "lucide-react";

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
import { completeOnboarding } from "@/actions/onboarding.server";
import posthog from "posthog-js";

const schema = z.object({
    agencyName: z.string().min(2, "Minimum 2 caractères"),
    firstName: z.string().min(2, "Minimum 2 caractères"),
    lastName: z.string().min(2, "Minimum 2 caractères"),
});

type FormValues = z.infer<typeof schema>;

interface OnboardingFormProps {
    defaultFirstName?: string;
    defaultLastName?: string;
}

export function OnboardingForm({ defaultFirstName = "", defaultLastName = "" }: OnboardingFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            agencyName: "",
            firstName: defaultFirstName,
            lastName: defaultLastName,
        },
    });

    function onSubmit(values: FormValues) {
        setError(null);
        startTransition(async () => {
            try {
                await completeOnboarding(values);
                posthog.capture("onboarding_completed", {
                    agency_name: values.agencyName,
                });
            } catch (e) {
                if (isRedirectError(e)) throw e;
                setError("Une erreur est survenue. Veuillez réessayer.");
            }
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
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                            Dernière étape !
                        </h1>
                        <p className="text-sm font-medium text-slate-400">
                            Configurez votre espace de travail pour commencer
                        </p>
                    </div>
                </div>

                {/* Form Body */}
                <div className="px-8 py-7 bg-white relative -mt-4 rounded-t-3xl">
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
                                name="agencyName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-xs font-semibold text-slate-700">
                                            Nom de l&apos;agence
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                <Input
                                                    placeholder="Acme Studio"
                                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                    disabled={isPending}
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-xs font-semibold text-slate-700">Prénom</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Jean"
                                                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                    disabled={isPending}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-xs font-semibold text-slate-700">Nom</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Dupont"
                                                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm rounded-xl"
                                                    disabled={isPending}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-900/20 transition-all duration-300 rounded-xl mt-2"
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isPending ? "Création en cours..." : "Créer mon espace →"}
                            </Button>
                        </form>
                    </Form>
                </div>

                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Vous pourrez modifier ces informations plus tard dans les paramètres.
                    </p>
                </div>
            </div>
        </div>
    );
}
