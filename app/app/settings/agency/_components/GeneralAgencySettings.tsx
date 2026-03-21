import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Agency, UpdateAgencyState } from "@/lib/validators/agency";
import { Building, Globe, Loader2, Mail, MapPin, Phone } from "lucide-react";

type GeneralAgencySettingsProps = {
	agency: Agency
	isAgencyPending: boolean
	agencyState: UpdateAgencyState | null
	agencyFormAction: (payload: FormData) => void
}
export default function GeneralAgencySettings(GenralAgencySettingsProps: GeneralAgencySettingsProps) {
	const { agency, isAgencyPending, agencyState, agencyFormAction } = GenralAgencySettingsProps
	return (
		<TabsContent value="general" className="space-y-6">
			<form action={agencyFormAction}>
				<Card className="border-border shadow-sm overflow-hidden pb-0">
					<CardHeader className="bg-card border-b border-border pb-6">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
								<Building className="h-5 w-5 text-blue-600" />
							</div>
							<div>
								<CardTitle className="text-lg font-semibold">Profil de l'agence</CardTitle>
								<CardDescription>Informations publiques et coordonnées de votre structure.</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6 space-y-8">
						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="agency-name" className="text-foreground font-medium">Nom commercial</Label>
								<Input
									id="agency-name"
									name="name"
									defaultValue={agency.name}
									disabled={isAgencyPending}
									className="focus-visible:ring-blue-500"
								/>
								{agencyState?.errors?.name && (
									<p className="text-xs text-destructive">{agencyState.errors.name[0]}</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="agency-website" className="text-foreground font-medium flex items-center gap-2">
									<Globe className="h-3.5 w-3.5 text-muted-foreground" /> Site internet
								</Label>
								<Input id="agency-website" name="website" type="url" placeholder="https://..." defaultValue={agency.website!} disabled={isAgencyPending} />
							</div>
						</div>

						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="agency-email" className="text-foreground font-medium flex items-center gap-2">
									<Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email contact
								</Label>
								<Input id="agency-email" name="email" type="email" defaultValue={agency.email!} disabled={isAgencyPending} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="agency-phone" className="text-foreground font-medium flex items-center gap-2">
									<Phone className="h-3.5 w-3.5 text-muted-foreground" /> Téléphone
								</Label>
								<Input id="agency-phone" name="phone" type="tel" defaultValue={agency.phone!} disabled={isAgencyPending} />
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="agency-address" className="text-foreground font-medium flex items-center gap-2">
								<MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Adresse du siège
							</Label>
							<Input id="agency-address" name="address" defaultValue={agency.address!} disabled={isAgencyPending} />
						</div>
					</CardContent>

					<CardFooter className="bg-muted/50 border-t border-border px-6 py-4 flex justify-between items-center">
						<p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider italic">Modifications sécurisées</p>
						<Button type="submit" disabled={isAgencyPending} className="shadow-sm transition-all active:scale-95">
							{isAgencyPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							Enregistrer les changements
						</Button>
					</CardFooter>
				</Card>

			<Card className="border-border shadow-sm overflow-hidden pb-0">
				<CardHeader className="bg-card border-b border-border pb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-lg">
							<Building className="h-5 w-5 text-violet-600" />
						</div>
						<div>
							<CardTitle className="text-lg font-semibold">Informations légales</CardTitle>
							<CardDescription>Mentions obligatoires apparaissant sur vos devis.</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-6 space-y-8">
					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="legal-name" className="text-foreground font-medium">Raison sociale</Label>
							<Input
								id="legal-name"
								name="legal_name"
								defaultValue={agency.legal_name ?? ""}
								disabled={isAgencyPending}
								placeholder="ACME SAS"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="legal-form" className="text-foreground font-medium">Forme juridique</Label>
							<Select name="legal_form" defaultValue={agency.legal_form ?? ""} disabled={isAgencyPending}>
								<SelectTrigger id="legal-form">
									<SelectValue placeholder="Sélectionner..." />
								</SelectTrigger>
								<SelectContent>
									{["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"].map(f => (
										<SelectItem key={f} value={f}>{f}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="rcs-number" className="text-foreground font-medium">N° RCS / Répertoire des métiers</Label>
							<Input
								id="rcs-number"
								name="rcs_number"
								defaultValue={agency.rcs_number ?? ""}
								disabled={isAgencyPending}
								placeholder="RCS Paris 123 456 789"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="vat-number" className="text-foreground font-medium">N° TVA intracommunautaire</Label>
							<Input
								id="vat-number"
								name="vat_number"
								defaultValue={agency.vat_number ?? ""}
								disabled={isAgencyPending}
								placeholder="FR00 000 000 000"
							/>
							{agencyState?.errors?.vat_number && (
								<p className="text-xs text-destructive">{agencyState.errors.vat_number[0]}</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
			</form>
		</TabsContent>


	)
}
