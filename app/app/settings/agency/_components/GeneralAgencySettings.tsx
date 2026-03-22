"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { Agency, UpdateAgencyProfileState, UpdateAgencyLegalState } from "@/lib/validators/agency"

const LEGAL_FORM_OPTIONS = ["SARL", "SAS", "SASU", "EURL", "SA", "SNC", "Auto-entrepreneur", "Autre"] as const

type Props = {
  agency: Agency
  profileFormAction: (payload: FormData) => void
  isProfilePending: boolean
  profileState: UpdateAgencyProfileState
  legalFormAction: (payload: FormData) => void
  isLegalPending: boolean
  legalState: UpdateAgencyLegalState
}

export default function GeneralAgencySettings({
  agency,
  profileFormAction,
  isProfilePending,
  profileState,
  legalFormAction,
  isLegalPending,
  legalState,
}: Props) {
  const router = useRouter()

  // Profile card — controlled state
  const [name, setName] = useState(agency.name)
  const [website, setWebsite] = useState(agency.website ?? "")
  const [email, setEmail] = useState(agency.email ?? "")
  const [phone, setPhone] = useState(agency.phone ?? "")
  const [address, setAddress] = useState(agency.address ?? "")

  // Legal card — controlled state
  const [legalName, setLegalName] = useState(agency.legal_name ?? "")
  const [legalForm, setLegalForm] = useState(agency.legal_form ?? "")
  const [rcsNumber, setRcsNumber] = useState(agency.rcs_number ?? "")
  const [vatNumber, setVatNumber] = useState(agency.vat_number ?? "")

  const isLegalComplete = [legalName, legalForm, rcsNumber, vatNumber].every(Boolean)

  // Refresh context after successful saves so SettingsProvider re-hydrates
  useEffect(() => {
    if (profileState?.success) router.refresh()
  }, [profileState, router])

  useEffect(() => {
    if (legalState?.success) router.refresh()
  }, [legalState, router])

  function resetProfile() {
    setName(agency.name)
    setWebsite(agency.website ?? "")
    setEmail(agency.email ?? "")
    setPhone(agency.phone ?? "")
    setAddress(agency.address ?? "")
  }

  function resetLegal() {
    setLegalName(agency.legal_name ?? "")
    setLegalForm(agency.legal_form ?? "")
    setRcsNumber(agency.rcs_number ?? "")
    setVatNumber(agency.vat_number ?? "")
  }

  return (
    <TabsContent value="general" className="space-y-6">

      {/* Card 1: Profile */}
      <form action={profileFormAction}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Profil de l&apos;agence</CardTitle>
            <CardDescription>Votre identité commerciale et coordonnées de contact.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Name — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom commercial <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.name && (
                <p className="text-xs text-destructive">{profileState.errors.name[0]}</p>
              )}
            </div>

            {/* Website — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="website">Site internet</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={e => setWebsite(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.website && (
                <p className="text-xs text-destructive">{profileState.errors.website[0]}</p>
              )}
            </div>

            {/* Email + Phone — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email de contact</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isProfilePending}
                />
                {profileState?.errors?.email && (
                  <p className="text-xs text-destructive">{profileState.errors.email[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={isProfilePending}
                />
                {profileState?.errors?.phone && (
                  <p className="text-xs text-destructive">{profileState.errors.phone[0]}</p>
                )}
              </div>
            </div>

            {/* Address — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse du siège</Label>
              <Input
                id="address"
                name="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={isProfilePending}
              />
              {profileState?.errors?.address && (
                <p className="text-xs text-destructive">{profileState.errors.address[0]}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t border-border flex items-center justify-between gap-3 py-4">
            {/* Inline feedback */}
            <div className="text-sm">
              {profileState?.success && <span className="text-emerald-600 font-medium">✓ Enregistré</span>}
              {profileState?.success === false && profileState.message && (
                <span className="text-destructive">{profileState.message}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetProfile} disabled={isProfilePending}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isProfilePending}>
                {isProfilePending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Card 2: Legal */}
      <form action={legalFormAction}>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">Mentions légales</CardTitle>
                <CardDescription>Informations requises sur vos devis en droit français.</CardDescription>
              </div>
              {isLegalComplete && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 shrink-0">
                  ✓ Complet
                </span>
              )}
            </div>
          </CardHeader>

          {/* Amber banner — shown when any legal field is missing */}
          {!isLegalComplete && (
            <div className="border-y border-amber-200 bg-amber-50 px-6 py-3 flex items-start gap-3">
              <span className="text-sm mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Ces informations sont absentes de vos devis</p>
                <p className="text-sm text-amber-700 mt-0.5">Renseignez-les pour être conforme aux obligations légales françaises.</p>
              </div>
            </div>
          )}

          <CardContent className="space-y-4 pt-4">
            {/* legal_name + legal_form — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="legal_name">Raison sociale</Label>
                <Input
                  id="legal_name"
                  name="legal_name"
                  placeholder="Ex : Wiply SAS"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  disabled={isLegalPending}
                />
                <p className="text-xs text-muted-foreground">Si différente du nom commercial</p>
                {legalState?.errors?.legal_name && (
                  <p className="text-xs text-destructive">{legalState.errors.legal_name[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legal_form">Forme juridique</Label>
                <Select
                  name="legal_form"
                  value={legalForm}
                  onValueChange={setLegalForm}
                  disabled={isLegalPending}
                >
                  <SelectTrigger id="legal_form">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORM_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {legalState?.errors?.legal_form && (
                  <p className="text-xs text-destructive">{legalState.errors.legal_form[0]}</p>
                )}
              </div>
            </div>

            {/* rcs_number + vat_number — 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rcs_number">N° RCS / Répertoire des métiers</Label>
                <Input
                  id="rcs_number"
                  name="rcs_number"
                  placeholder="Ex : Paris B 123 456 789"
                  value={rcsNumber}
                  onChange={e => setRcsNumber(e.target.value)}
                  disabled={isLegalPending}
                />
                {legalState?.errors?.rcs_number && (
                  <p className="text-xs text-destructive">{legalState.errors.rcs_number[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat_number">N° TVA intracommunautaire</Label>
                <Input
                  id="vat_number"
                  name="vat_number"
                  placeholder="Ex : FR12 345 678 901"
                  value={vatNumber}
                  onChange={e => setVatNumber(e.target.value)}
                  disabled={isLegalPending}
                />
                {legalState?.errors?.vat_number && (
                  <p className="text-xs text-destructive">{legalState.errors.vat_number[0]}</p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border flex items-center justify-between gap-3 py-4">
            {/* Inline feedback */}
            <div className="text-sm">
              {legalState?.success && <span className="text-emerald-600 font-medium">✓ Enregistré</span>}
              {legalState?.success === false && legalState.message && (
                <span className="text-destructive">{legalState.message}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetLegal} disabled={isLegalPending}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isLegalPending}>
                {isLegalPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

    </TabsContent>
  )
}
