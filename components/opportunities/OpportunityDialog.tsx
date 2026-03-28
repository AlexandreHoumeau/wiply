'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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

import { createOpportunity, updateOpportunity } from "@/actions/opportunity.client";
import { analyzeCompanyWebsiteAction } from "@/actions/ai.server";
import { useUpgradeDialog } from "@/providers/UpgradeDialogProvider";
import { mapContactViaLabel, mapOpportunityStatusLabel, mapOpportunityWithCompanyToFormValues, OpportunityFormValues, opportunitySchema, OpportunityWithCompany } from "@/lib/validators/oppotunities";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { Building2, FileText, Mail, MapPin, Phone, Globe, Briefcase, Check, ChevronsUpDown, Loader2, Wand2, Link2, Plus, X } from "lucide-react";
import { BUSINESS_SECTORS } from "@/utils/business-sectors";
import { cn } from "@/lib/utils";
import { useFieldArray } from "react-hook-form";

const LINK_PRESETS = [
	{ label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/...' },
	{ label: 'Instagram', placeholder: 'https://instagram.com/...' },
	{ label: 'Dribbble',  placeholder: 'https://dribbble.com/...' },
	{ label: 'Behance',   placeholder: 'https://behance.net/...' },
]

interface OpportunityDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialData?: OpportunityWithCompany | null;
	onSaved: () => void;
	userProfile: { agency_id: string };
}

export function OpportunityDialog({
	open,
	onOpenChange,
	initialData,
	onSaved,
	userProfile
}: OpportunityDialogProps) {
	const [sectorOpen, setSectorOpen] = useState(false);
	const [isAnalyzing, startAnalysis] = useTransition();

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
			company_links: [],
			status: "to_do",
			contact_via: "email",
		},
	});

	const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
		control: form.control,
		name: "company_links",
	});

	// Watch contact_via to show conditional required fields
	const contactVia = useWatch({ control: form.control, name: "contact_via" });
	const companyWebsite = useWatch({ control: form.control, name: "company_website" });

	const { openUpgradeDialog } = useUpgradeDialog();

	function handleAnalyzeWebsite() {
		if (!companyWebsite) return;
		startAnalysis(async () => {
			const result = await analyzeCompanyWebsiteAction(companyWebsite, userProfile.agency_id);
			if (result.success) {
				form.setValue("description", result.analysis);
				toast.success("Analyse générée !");
			} else if (result.needsUpgrade) {
				openUpgradeDialog(result.error, userProfile.agency_id);
			} else {
				toast.error(result.error);
			}
		});
	}

	useEffect(() => {
		if (initialData) {
			form.reset(mapOpportunityWithCompanyToFormValues(initialData));
		} else {
			form.reset({
				name: "",
				description: "",
				company_name: "",
				company_email: "",
				company_phone: "",
				company_website: "",
				company_address: "",
				company_sector: "",
				company_links: [],
				status: "to_do",
				contact_via: "email",
			});
		}
	}, [initialData, form, open]);

	const createMutation = useMutation({
		mutationFn: (values: OpportunityFormValues) =>
			createOpportunity(values, userProfile.agency_id),
		onSuccess: () => {
			toast.success("Opportunité créée avec succès!");
			form.reset();
			onSaved();
		},
		onError: (error) => {
			toast.error("Erreur lors de la création");
			console.error(error);
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, values }: { id: string; values: OpportunityFormValues }) =>
			updateOpportunity(id, values),
		onSuccess: () => {
			toast.success("Opportunité mise à jour avec succès!");
			onSaved();
		},
		onError: (error) => {
			toast.error("Erreur lors de la mise à jour");
			console.error(error);
		},
	});

	useLoadingBar(createMutation.isPending || updateMutation.isPending);

	const handleSubmit = (values: OpportunityFormValues) => {
		if (initialData) {
			updateMutation.mutate({ id: initialData.id, values });
		} else {
			createMutation.mutate(values);
		}
	};

	const isLoading = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
				<DialogHeader className="px-6 pt-6 pb-4">
					<DialogTitle className="text-2xl">
						{initialData ? "Modifier l'opportunité" : "Nouvelle opportunité"}
					</DialogTitle>
					<DialogDescription>
						{initialData
							? "Modifiez les informations de l'opportunité ci-dessous."
							: "Remplissez les informations pour créer une nouvelle opportunité."
						}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
						{/* Changed: Removed px-6 from ScrollArea and added proper padding to inner div */}
						<ScrollArea className="flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
							<div className="space-y-6 px-6 py-1 pb-6">
								{/* Opportunity Section */}
								<div className="space-y-4">
									<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
										<FileText className="h-4 w-4" />
										<span>INFORMATIONS DE L'OPPORTUNITÉ</span>
									</div>

									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nom de l'opportunité *</FormLabel>
												<FormControl>
													<Input placeholder="Ex: Refonte du site web" {...field} />
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
													<Textarea
														placeholder="Décrivez l'opportunité..."
														className="resize-none"
														rows={3}
														{...field}
													/>
												</FormControl>
												<FormMessage />
												{companyWebsite && (
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground"
														onClick={handleAnalyzeWebsite}
														disabled={isAnalyzing}
													>
														{isAnalyzing ? (
															<Loader2 className="h-3 w-3 animate-spin" />
														) : (
															<Wand2 className="h-3 w-3" />
														)}
														{isAnalyzing ? "Analyse en cours…" : "Générer depuis le site web"}
													</Button>
												)}
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="status"
											render={({ field }) => (
												<FormItem className="w-full">
													<FormLabel>Statut</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl className="w-full">
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{Object.entries(mapOpportunityStatusLabel).map(([key, label]) => (
																<SelectItem key={key} value={key}>{label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="contact_via"
											render={({ field }) => (
												<FormItem className="w-full">
													<FormLabel>Méthode de contact</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl className="w-full">
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{Object.entries(mapContactViaLabel).map(([key, label]) => (
																<SelectItem key={key} value={key}>{label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>

								<Separator />

								{/* Company Section */}
								<div className="space-y-4">
									<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
										<Building2 className="h-4 w-4" />
										<span>INFORMATIONS DE L'ENTREPRISE</span>
									</div>

									<FormField
										control={form.control}
										name="company_name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nom de l'entreprise *</FormLabel>
												<FormControl>
													<Input placeholder="Ex: ACME Corp" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="company_email"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="flex items-center gap-2">
														<Mail className="h-3.5 w-3.5" />
														Email {contactVia === "email" && <span className="text-red-500">*</span>}
													</FormLabel>
													<FormControl>
														<Input type="email" placeholder="contact@example.com" {...field} />
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
													<FormLabel className="flex items-center gap-2">
														<Phone className="h-3.5 w-3.5" />
														Téléphone {contactVia === "phone" && <span className="text-red-500">*</span>}
													</FormLabel>
													<FormControl>
														<Input placeholder="+33 1 23 45 67 89" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<FormField
										control={form.control}
										name="company_website"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<Globe className="h-3.5 w-3.5" />
													Site web
												</FormLabel>
												<FormControl>
													<Input placeholder="https://example.com" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="company_address"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<MapPin className="h-3.5 w-3.5" />
													Adresse
												</FormLabel>
												<FormControl>
													<Input placeholder="123 Rue de la Paix, Paris" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="company_sector"
										render={({ field }) => (
											<FormItem className="flex flex-col">
												<FormLabel className="flex items-center gap-2">
													<Briefcase className="h-3.5 w-3.5" />
													Secteur d'activité
												</FormLabel>
												<Popover open={sectorOpen} onOpenChange={setSectorOpen}>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																role="combobox"
																className={cn(
																	"justify-between",
																	!field.value && "text-muted-foreground"
																)}
															>
																{field.value || "Sélectionner ou saisir un secteur..."}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent className="w-[400px] p-0" align="start">
														<Command>
															<CommandInput
																placeholder="Rechercher ou créer un secteur..."
																value={field.value}
																onValueChange={(value) => {
																	form.setValue("company_sector", value);
																}}
															/>
															<CommandList>
																{field.value && !BUSINESS_SECTORS.includes(field.value) && (
																	<CommandGroup>
																		<CommandItem
																			value={field.value}
																			onSelect={() => {
																				form.setValue("company_sector", field.value);
																				setSectorOpen(false);
																			}}
																		>
																			<Check className="mr-2 h-4 w-4 opacity-100" />
																			Créer "{field.value}"
																		</CommandItem>
																	</CommandGroup>
																)}
																<CommandEmpty>
																	{field.value ? `Appuyez sur Entrée pour créer "${field.value}"` : "Aucun secteur trouvé."}
																</CommandEmpty>
																<CommandGroup heading="Secteurs suggérés">
																	{BUSINESS_SECTORS.map((sector) => (
																		<CommandItem
																			value={sector}
																			key={sector}
																			onSelect={() => {
																				form.setValue("company_sector", sector);
																				setSectorOpen(false);
																			}}
																		>
																			<Check
																				className={cn(
																					"mr-2 h-4 w-4",
																					sector === field.value
																						? "opacity-100"
																						: "opacity-0"
																				)}
																			/>
																			{sector}
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
								</div>
							</div>

							<Separator />

							{/* Links Section */}
							<div className="space-y-4 py-4 px-6">
								<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
									<Link2 className="h-4 w-4" />
									<span>LIENS & RÉSEAUX</span>
								</div>

								{/* Preset shortcut buttons */}
								<div className="flex flex-wrap gap-2">
									{LINK_PRESETS.map((preset) => {
										const alreadyAdded = linkFields.some(f => f.label === preset.label)
										return (
											<Button
												key={preset.label}
												type="button"
												variant="outline"
												size="sm"
												className="h-7 px-3 text-xs gap-1.5"
												disabled={alreadyAdded}
												onClick={() => appendLink({ label: preset.label, url: "" })}
											>
												<Plus className="h-3 w-3" />
												{preset.label}
											</Button>
										)
									})}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-7 px-3 text-xs gap-1.5"
										onClick={() => appendLink({ label: "", url: "" })}
									>
										<Plus className="h-3 w-3" />
										Personnalisé
									</Button>
								</div>

								{/* Link rows */}
								{linkFields.length > 0 && (
									<div className="space-y-2">
										{linkFields.map((field, index) => {
											const isPreset = LINK_PRESETS.some(p => p.label === field.label)
											const placeholder = LINK_PRESETS.find(p => p.label === field.label)?.placeholder ?? "https://..."
											return (
												<div key={field.id} className="flex items-center gap-2">
													{isPreset ? (
														<span className="shrink-0 inline-flex items-center h-9 px-3 rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground min-w-[90px]">
															{field.label}
														</span>
													) : (
														<FormField
															control={form.control}
															name={`company_links.${index}.label`}
															render={({ field: f }) => (
																<FormItem className="shrink-0 w-[110px]">
																	<FormControl>
																		<Input placeholder="Nom" className="h-9 text-xs" {...f} />
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													)}
													<FormField
														control={form.control}
														name={`company_links.${index}.url`}
														render={({ field: f }) => (
															<FormItem className="flex-1">
																<FormControl>
																	<Input placeholder={placeholder} className="h-9 text-xs" {...f} />
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
														onClick={() => removeLink(index)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											)
										})}
									</div>
								)}
							</div>
						</ScrollArea>

						{/* Fixed Footer with Buttons */}
						<div className="border-t px-6 py-4 bg-muted/10">
							<div className="flex justify-end gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isLoading}
								>
									Annuler
								</Button>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? (
										<>
											<span className="mr-2">⏳</span>
											{initialData ? "Mise à jour..." : "Création..."}
										</>
									) : (
										initialData ? "Mettre à jour" : "Créer"
									)}
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
