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
import { motion } from "framer-motion";

const schema = z.object({
    agencyName: z.string().min(2, "Minimum 2 caractères"),
    firstName: z.string().min(2, "Minimum 2 caractères"),
    lastName: z.string().min(2, "Minimum 2 caractères"),
});

type FormValues = z.infer<typeof schema>;

interface OnboardingFormProps {
    defaultFirstName?: string;
    defaultLastName?: string;
    campaignCode?: string | null;
}

export function OnboardingForm({ defaultFirstName = "", defaultLastName = "", campaignCode }: OnboardingFormProps) {
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
                await completeOnboarding({ ...values, campaignCode });
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
        <div className="w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_rgba(139,109,248,0.15)] border border-white/50 relative overflow-hidden">
            {/* Top Gradient Accent - La signature visuelle Wiply */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FDE1BA] via-[#E8D2E1] to-[#C1B2FA]" />

            <div className="text-center mb-8">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#F1EFFD] mb-4"
                >
                    <Sparkles className="w-6 h-6 text-[#967CFB]" />
                </motion.div>
                
                <h1 className="text-3xl sm:text-4xl font-black text-[#4C4C4C] font-[family-name:var(--font-passion-one)] tracking-tight mb-2">
                    Dernière étape !
                </h1>
                <p className="text-[#7A7A7A] font-medium text-sm">
                    Personnalisez votre espace pour une <br className="hidden sm:block" /> expérience sur-mesure.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {error && (
                        <Alert className="border-red-100 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm font-medium ml-1">{error}</AlertDescription>
                        </Alert>
                    )}

                    <FormField
                        control={form.control}
                        name="agencyName"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">
                                    Nom de votre agence
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D1CBFA] pointer-events-none" />
                                        <Input
                                            placeholder="ex: Wiply Studio"
                                            className="h-12 pl-11 bg-[#F8F9FF] border-[#EBF0FE] focus:border-[#967CFB] focus:ring-0 transition-all rounded-xl text-[#4C4C4C]"
                                            disabled={isPending}
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-sm font-bold text-[#4C4C4C] ml-1">Prénom</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Jean"
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
                        className="w-full h-14 bg-[#967CFB] text-white font-black text-lg rounded-2xl hover:bg-[#8364f9] shadow-[0_10px_20px_rgba(150,124,251,0.2)] transition-all duration-300 mt-4 group"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : null}
                        {isPending ? "Configuration..." : "Lancer mon espace"}
                        {!isPending && (
                             <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                        )}
                    </Button>
                </form>
            </Form>

            <div className="mt-8 pt-6 border-t border-[#F1EFFD] text-center text-xs font-medium text-[#D1CBFA] tracking-wide uppercase">
                Bienvenue dans le nouvel OS de votre agence
            </div>
        </div>
    );
}