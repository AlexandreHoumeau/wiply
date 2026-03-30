"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"; // Ou ton système de toast actuel
import { Check, ChevronsUpDown, Plus, Building2, FolderKanban, Mail, Phone, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { NewProjectFormValues, newProjectSchema } from "@/lib/validators/project";
import { createProject } from "@/actions/project.server";
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider";

export function NewProjectModal({
    companies,
    agencyId
}: {
    companies: { id: string; name: string }[];
    agencyId: string; // Nouvel argument requis
}) {
    const [open, setOpen] = useState(false);
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    const { openUpgradeDialog } = useUpgradeDialog();

    const form = useForm<NewProjectFormValues>({
        resolver: zodResolver(newProjectSchema),
        defaultValues: {
            name: "",
            isNewCompany: false,
            companyId: "none",
            newCompanyData: {
                name: "",
                email: "",
                phone_number: "",
                website: "",
                business_sector: ""
            },
        },
    });

    const isNewCompany = useWatch({ control: form.control, name: "isNewCompany" });

    async function onSubmit(data: NewProjectFormValues) {
        const result = await createProject(data, agencyId);
        if (!result.success) {
            if (result.error.includes('plan PRO') || result.error.includes('Quota')) {
                setOpen(false);
                openUpgradeDialog(result.error, agencyId);
            } else {
                toast.error(result.error);
            }
            return;
        }
        toast.success("Projet créé avec succès !");
        setOpen(false);
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-11 px-6 transition-all active:scale-95 font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Projet
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden rounded-3xl">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                            <FolderKanban className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold">Lancer un projet</DialogTitle>
                            <DialogDescription>
                                Configurez l'espace de travail et reliez-le à un client.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
                        <ScrollArea className="flex-1 px-6 py-2">
                            <div className="space-y-8 pb-6">

                                {/* --- INFOS PROJET --- */}
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom du projet *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Refonte Site Vitrine" className="h-11 rounded-xl" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                {/* --- INFOS CLIENT --- */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <Building2 className="h-4 w-4 text-slate-500" />
                                            <span>Client / Entreprise</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => form.setValue("isNewCompany", !isNewCompany)}
                                            className="text-sm font-bold text-primary hover:text-primary/80"
                                        >
                                            {isNewCompany ? "Choisir existante" : "+ Créer une entreprise"}
                                        </button>
                                    </div>

                                    {!isNewCompany ? (
                                        /* COMBOBOX POUR RECHERCHE RAPIDE */
                                        <FormField
                                            control={form.control}
                                            name="companyId"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn("justify-between h-11 rounded-xl", !field.value && "text-slate-500")}
                                                                >
                                                                    {field.value === "none" || !field.value
                                                                        ? "Projet interne (Aucun client)"
                                                                        : companies.find((c) => c.id === field.value)?.name}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Rechercher une entreprise..." />
                                                                <CommandList>
                                                                    <CommandEmpty>Aucune entreprise trouvée.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        <CommandItem
                                                                            value="none"
                                                                            onSelect={() => {
                                                                                form.setValue("companyId", "none");
                                                                                setIsComboboxOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", field.value === "none" ? "opacity-100" : "opacity-0")} />
                                                                            Projet interne (Aucun client)
                                                                        </CommandItem>
                                                                        {companies.map((company) => (
                                                                            <CommandItem
                                                                                key={company.id}
                                                                                value={company.name} // On recherche sur le nom
                                                                                onSelect={() => {
                                                                                    form.setValue("companyId", company.id);
                                                                                    setIsComboboxOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check className={cn("mr-2 h-4 w-4", field.value === company.id ? "opacity-100" : "opacity-0")} />
                                                                                {company.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ) : (
                                        /* FORMULAIRE NOUVELLE ENTREPRISE */
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <FormField
                                                control={form.control}
                                                name="newCompanyData.name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nom de l'entreprise *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ex: ACME Corp" className="bg-white" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="newCompanyData.email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</FormLabel>
                                                            <FormControl><Input placeholder="contact@..." className="bg-white" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="newCompanyData.phone_number"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Téléphone</FormLabel>
                                                            <FormControl><Input placeholder="+33..." className="bg-white" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="newCompanyData.website"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Site Web</FormLabel>
                                                            <FormControl><Input placeholder="https://..." className="bg-white" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="newCompanyData.business_sector"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Secteur d'activité</FormLabel>
                                                            <FormControl><Input placeholder="Ex: E-commerce" className="bg-white" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex justify-end gap-3 mt-auto">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Création..." : "Créer le projet"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
