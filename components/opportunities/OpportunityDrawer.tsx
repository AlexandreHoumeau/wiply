'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { createOpportunity, updateOpportunity } from "@/actions/opportunity.client";
import { mapContactViaLabel, mapOpportunityStatusLabel, mapOpportunityWithCompanyToFormValues, OpportunityFormValues, opportunitySchema, OpportunityWithCompany } from "@/lib/validators/oppotunities";

interface OpportunityDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: OpportunityWithCompany | null;
    onSaved: (opportunity: OpportunityWithCompany) => void;
    userProfile: { agency_id: string };
}

export function OpportunityDrawer({
    open,
    onOpenChange,
    initialData,
    onSaved,
    userProfile
}: OpportunityDrawerProps) {
    const [error, setError] = useState<string | null>(null);
    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunitySchema),
        defaultValues: {
            name: "",
            description: "",
            company_name: "",
            company_email: "",
            company_phone: "",
            company_website: "",
            company_address: "",
            company_sector: "",
            status: "to_do",
            contact_via: "email",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset(mapOpportunityWithCompanyToFormValues(initialData));
        } else {
            form.reset();
        }
    }, [initialData, form]);

    const onSubmit = async (values: OpportunityFormValues) => {
        setError(null);

        try {
            const opportunity = initialData
                ? await updateOpportunity(initialData.id, values)
                : await createOpportunity(values, userProfile.agency_id);

            if (!opportunity) {
                setError("Impossible de créer l'opportunité. Réessayez.");
                return;
            }

            onSaved(opportunity);
            onOpenChange(false);
            form.reset();
        } catch (err: unknown) {
            console.error(err);
            setError("Une erreur est survenue. Réessayez.");
        }
    };
 
    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="flex flex-col h-full">
                <DrawerHeader>
                    <DrawerTitle>
                        {initialData ? "Modifier l'opportunité" : "Nouvelle opportunité"}
                    </DrawerTitle>
                </DrawerHeader>

                <ScrollArea className="flex-1 px-4 py-2 overflow-auto">
                    {error && (
                        <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 rounded">
                            {error}
                        </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* OPPORTUNITY */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom *</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            {/* COMPANY */}
                            <FormField
                                control={form.control}
                                name="company_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Entreprise *</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Téléphone</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site internet</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company_sector"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Secteur d'activité</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            {/* STATUS */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Statut</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(mapOpportunityStatusLabel).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* CONTACT VIA */}
                            <FormField
                                control={form.control}
                                name="contact_via"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact via</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(mapContactViaLabel).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </ScrollArea>

                <DrawerFooter className="px-4 py-3 border-t flex justify-end">
                    <Button onClick={form.handleSubmit(onSubmit)}>{initialData ? "Mettre à jour" : "Créer"}</Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
