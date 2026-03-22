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
- **Body** :
  - `name` — Nom commercial (pleine largeur, requis)
  - `website` — Site internet (pleine largeur)
  - `email` + `phone` — 2 colonnes
  - `address` — Adresse du siège (pleine largeur)
- **Footer** : boutons Cancel + Enregistrer (alignés à droite)

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
- **Footer** : boutons Cancel + Enregistrer (alignés à droite)

---

## Architecture technique

### Server Actions
Remplacer l'action unique `updateAgencyInformation` par deux actions distinctes :

- `updateAgencyProfile(formData)` — met à jour `name`, `website`, `email`, `phone`, `address`
- `updateAgencyLegal(formData)` — met à jour `legal_name`, `legal_form`, `rcs_number`, `vat_number`

Les deux actions partagent la même logique : vérification du rôle `agency_admin`, validation Zod, update Supabase, `revalidateTag`.

### Page (`page.tsx`)
Deux `useActionState` distincts, un par card :
```ts
const [profileState, profileFormAction, isProfilePending] = useActionState(updateAgencyProfile, null)
const [legalState, legalFormAction, isLegalPending] = useActionState(updateAgencyLegal, null)
```

Chaque card est un `<form action={...}>` indépendant.

### Composant `GeneralAgencySettings.tsx`
Refonte complète. Reçoit en props :
- `agency: Agency` — données actuelles
- `profileFormAction` + `isProfilePending`
- `legalFormAction` + `isLegalPending`
- `profileState` + `legalState` (pour les messages d'erreur/succès inline)

La logique de "complétion" des mentions légales est calculée dans le composant :
```ts
const legalFields = ['legal_name', 'legal_form', 'rcs_number', 'vat_number']
const isLegalComplete = legalFields.every(f => !!agency[f])
```

### Feedback inline
Remplace les `<Alert>` globaux en haut de page. Chaque card affiche son propre feedback dans le footer, à gauche des boutons :
- Succès : texte vert "✓ Enregistré"
- Erreur : texte rouge avec le message

---

## Fichiers concernés

| Fichier | Action |
|---|---|
| `app/app/settings/agency/_components/GeneralAgencySettings.tsx` | Refonte complète |
| `app/app/settings/agency/page.tsx` | Remplacer useActionState unique par deux hooks |
| `actions/agency.server.ts` | Ajouter `updateAgencyProfile` et `updateAgencyLegal` |

---

## Périmètre exclu

- Logo upload (`logo_url`) — hors scope
- Brand colors (`primary_color`, `secondary_color`) — hors scope
- Onglet Équipe — inchangé
- Autres pages de settings — inchangées
