# Design : Refonte UI des paramètres d'agence

**Date** : 2026-03-22
**Branche** : feature/quotes
**Statut** : Approuvé

---

## Contexte

La page `/app/settings/agency` contient actuellement deux cards dans un seul `<form>` avec un seul bouton "Enregistrer les changements". L'objectif est de la refondre en une interface premium SaaS : une card par section avec son propre Save/Cancel, et un traitement clair des champs légaux manquants.

---

## Décisions de design

### Layout général
**Cards empilées full-width** (style Stripe/Notion) — chaque section est une card indépendante avec son propre bouton Save, son propre état de formulaire et son propre feedback.

### Indicateur de champs manquants
**Banner amber à l'intérieur de la card** — visible uniquement quand au moins un champ légal est vide. Contient un titre et une explication. Disparaît quand tous les champs sont renseignés, remplacé par un badge vert "✓ Complet" dans le header de la card.

---

## Structure de la page

### Onglet "Général" — 2 cards

#### Card 1 : Profil de l'agence
- **Header** : titre + description "Votre identité commerciale et coordonnées de contact."
- **Body** (tous les champs en pleine largeur sauf la paire email/phone) :
  - `name` — Nom commercial (pleine largeur, requis)
  - `website` — Site internet (pleine largeur)
  - `email` + `phone` — 2 colonnes
  - `address` — Adresse du siège (pleine largeur)
- **Footer** : boutons Cancel + Enregistrer (alignés à droite) + feedback inline à gauche

#### Card 2 : Mentions légales
- **Header** : titre + description "Informations requises sur vos devis en droit français."
  - Quand complet : badge vert `✓ Complet` dans le header (côté droit)
- **Banner amber** (conditionnel, affiché si au moins un champ vide) :
  - Titre : "Ces informations sont absentes de vos devis"
  - Sous-titre : "Renseignez-les pour être conforme aux obligations légales françaises."
- **Body** :
  - `legal_name` + `legal_form` — 2 colonnes
    - `legal_name` : hint "Si différente du nom commercial"
    - `legal_form` : Select (SARL, SAS, SASU, EURL, SA, SNC, Auto-entrepreneur, Autre)
  - `rcs_number` + `vat_number` — 2 colonnes
    - `rcs_number` : placeholder "Ex : Paris B 123 456 789"
    - `vat_number` : placeholder "Ex : FR12 345 678 901"
- **Footer** : boutons Cancel + Enregistrer (alignés à droite) + feedback inline à gauche

---

## Architecture technique

### Composants contrôlés (`useState`)
Les deux cards utilisent des champs **contrôlés** (`useState` par champ, initialisé depuis `agency` prop). Cela permet :
- **Cancel** : réinitialiser les états locaux aux valeurs initiales de `agency` (y compris le `<Select>` shadcn qui ne supporte pas le reset natif)
- **`isLegalComplete`** : calculé depuis les valeurs locales des champs, pas depuis `agency` — la banner/badge se met à jour instantanément au fil de la saisie sans attendre un refresh

```ts
// Exemple dans la card légale
const [legalName, setLegalName] = useState(agency.legal_name ?? "")
const [legalForm, setLegalForm] = useState(agency.legal_form ?? "")
const [rcsNumber, setRcsNumber] = useState(agency.rcs_number ?? "")
const [vatNumber, setVatNumber] = useState(agency.vat_number ?? "")

const isLegalComplete = [legalName, legalForm, rcsNumber, vatNumber].every(Boolean)
```

Après un save réussi, appeler `router.refresh()` pour re-hydrater le contexte Settings. Ce call doit être dans un `useEffect` qui observe le state de l'action — pas inline dans le handler de submit — pour s'exécuter après que le server action ait complété et mis à jour le state :

```ts
useEffect(() => {
  if (legalState?.success) router.refresh()
}, [legalState])
```

### Schemas Zod (`lib/validators/agency.ts`)
Ajouter deux nouveaux schemas nommés :

```ts
export const updateAgencyProfileSchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  address: addressSchema.optional().or(z.literal("")),
})

export const updateAgencyLegalSchema = z.object({
  legal_name: z.string().max(200).optional().or(z.literal("")),
  legal_form: legalFormSchema.optional(),
  rcs_number: z.string().max(100).optional().or(z.literal("")),
  vat_number: z.string().regex(/^FR\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, "Format invalide").optional().or(z.literal("")),
})
```

### Types d'état (`lib/validators/agency.ts`)
Ajouter deux types d'état distincts pour les deux actions :

```ts
export type UpdateAgencyProfileState = {
  success: boolean
  message?: string
  errors?: {
    name?: string[]
    website?: string[]
    email?: string[]
    phone?: string[]
    address?: string[]
  }
} | null

export type UpdateAgencyLegalState = {
  success: boolean
  message?: string
  errors?: {
    legal_name?: string[]
    legal_form?: string[]
    rcs_number?: string[]
    vat_number?: string[]
  }
} | null
```

### Server Actions (`actions/agency.server.ts`)
Remplacer `updateAgencyInformation` par deux actions :

**`updateAgencyProfile(state, formData): Promise<UpdateAgencyProfileState>`**
- Valide avec `updateAgencyProfileSchema`
- Met à jour `name`, `website`, `email`, `phone`, `address`
- `revalidateTag(`settings-${user.id}`)` (1 seul argument) + `revalidatePath('/app/settings/agency')`
- Ne pas copier le pattern erroné de l'action existante qui passe `{}` en second argument à `revalidateTag`

**`updateAgencyLegal(state, formData): Promise<UpdateAgencyLegalState>`**
- Valide avec `updateAgencyLegalSchema`
- Met à jour `legal_name`, `legal_form`, `rcs_number`, `vat_number`
- Même pattern `revalidateTag` / `revalidatePath` que ci-dessus

**Suppression de `updateAgencyInformation`** : cette action a deux consommateurs :
1. `app/app/settings/agency/page.tsx` — migré dans ce scope
2. `app/app/agency/_components/AgencyInfoCard.tsx` — migrer vers `updateAgencyProfile` dans ce scope également (les champs couverts sont identiques)

### Page (`page.tsx`)
`page.tsx` est et reste `"use client"` (requis pour `useActionState` — ne pas retirer la directive).

```ts
const [profileState, profileFormAction, isProfilePending] = useActionState(updateAgencyProfile, null)
const [legalState, legalFormAction, isLegalPending] = useActionState(updateAgencyLegal, null)
```

Chaque card est un `<form action={...}>` indépendant. Supprimer les `<Alert>` globaux actuels.

### Composant `GeneralAgencySettings.tsx`
Refonte complète. Reçoit en props :
```ts
{
  agency: Agency
  profileFormAction: (formData: FormData) => void
  isProfilePending: boolean
  profileState: UpdateAgencyProfileState
  legalFormAction: (formData: FormData) => void
  isLegalPending: boolean
  legalState: UpdateAgencyLegalState
}
```

### Feedback inline
Dans le footer de chaque card, à gauche des boutons :
- Succès : texte vert "✓ Enregistré"
- Erreur : texte rouge avec `state.message` (message générique) ou erreur par champ sous l'input concerné

### Comportement du bouton Cancel
`onClick` handler qui réassigne chaque `useState` local aux valeurs initiales issues de `agency`. Pas de `<button type="reset">` natif (incompatible avec shadcn `<Select>`).

### Transition banner ↔ badge
Conditionnel React standard, pas d'animation explicite requise.

---

## Fichiers concernés

| Fichier | Action |
|---|---|
| `lib/validators/agency.ts` | Ajouter `updateAgencyProfileSchema`, `updateAgencyLegalSchema`, `UpdateAgencyProfileState`, `UpdateAgencyLegalState` |
| `actions/agency.server.ts` | Ajouter `updateAgencyProfile` et `updateAgencyLegal`, supprimer `updateAgencyInformation` |
| `app/app/settings/agency/page.tsx` | Deux `useActionState`, supprimer les Alerts globaux |
| `app/app/settings/agency/_components/GeneralAgencySettings.tsx` | Refonte complète |
| `app/app/agency/_components/AgencyInfoCard.tsx` | Migrer de `updateAgencyInformation` vers `updateAgencyProfile` |

---

## Périmètre exclu

- Logo upload (`logo_url`) — hors scope
- Brand colors (`primary_color`, `secondary_color`) — hors scope
- Onglet Équipe — inchangé
- Autres pages de settings — inchangées
