# Design : Mentions légales obligatoires sur les devis

**Date** : 2026-03-21
**Branche** : feature/quotes
**Statut** : Approuvé

---

## Contexte

Les devis Wiply doivent afficher toutes les mentions légales obligatoires en droit français :
la date du devis, la durée de validité, l'identité complète du vendeur (nom, raison sociale, adresse, forme juridique, RCS, TVA), l'identité du client (nom, adresse de facturation), la date de début de prestation, le décompte des prestations, les modalités de paiement, et les totaux HT/TTC/TVA.

Plusieurs de ces informations sont déjà présentes (titre, valid_until, items, tax_rate, totaux, company name). Ce design couvre les champs manquants.

---

## Approche retenue

**Colonnes individuelles** sur les tables existantes — cohérent avec le pattern du projet (tout est typé individuellement dans les validators Zod).

---

## 1. Migrations DB

### Table `agencies`
```sql
ALTER TABLE agencies
  ADD COLUMN legal_name   TEXT,
  ADD COLUMN legal_form   TEXT,
  ADD COLUMN rcs_number   TEXT,
  ADD COLUMN vat_number   TEXT;
```

- `legal_name` : raison sociale (peut différer du nom commercial)
- `legal_form` : forme juridique parmi SARL, SAS, SASU, EURL, SA, SNC, Auto-entrepreneur, Autre
- `rcs_number` : numéro RCS ou répertoire des métiers
- `vat_number` : numéro TVA intracommunautaire (format FR + 11 chiffres)

### Table `companies`
```sql
ALTER TABLE companies
  ADD COLUMN billing_address TEXT;
```

- `billing_address` : adresse de facturation si différente du siège social

### Table `quotes`
```sql
ALTER TABLE quotes
  ADD COLUMN service_start_date  DATE,
  ADD COLUMN payment_terms_preset TEXT,
  ADD COLUMN payment_terms_notes  TEXT;
```

- `service_start_date` : date de début de la prestation
- `payment_terms_preset` : valeur parmi `immediate`, `15_days`, `30_days`, `45_days`, `60_days`, `custom`
- `payment_terms_notes` : texte libre pour préciser les modalités

Toutes les nouvelles colonnes sont nullable pour ne pas bloquer les devis existants. Pas de migration `DOWN` nécessaire (colonnes nullable, aucune contrainte ajoutée).

---

## 2. Validators & Types

### `lib/validators/agency.ts`
- Ajouter `legal_name`, `legal_form`, `rcs_number`, `vat_number` à `updateAgencySchema` (tous optionnels)
- Étendre **le type `Agency` hand-written** (lignes 154–170) avec ces 4 champs nullable : `legal_name: string | null`, `legal_form: string | null`, `rcs_number: string | null`, `vat_number: string | null`
- Ajouter `legalFormSchema` : `z.enum(['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'Auto-entrepreneur', 'Autre'])`
- Validation TVA : `z.string().regex(/^FR\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/).optional()` dans le schema

### `lib/validators/quotes.ts`
- Ajouter `service_start_date`, `payment_terms_preset`, `payment_terms_notes` à `QuoteSchema` (tous optionnels/nullable)
- `payment_terms_preset` : `z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom']).nullable()`
- `UpdateQuoteSchema` et `CreateQuoteSchema` mis à jour automatiquement via `.partial()` / `.omit()`

### `lib/validators/companies.ts`
- `companies.ts` contient uniquement des types TypeScript hand-written, **pas de schema Zod**
- Ajouter `billing_address: string | null` au type `Company` existant
- Ajouter un `updateCompanySchema` Zod minimal (uniquement les champs éditables dans ce scope) : `z.object({ id: z.string().uuid(), billing_address: z.string().nullable().optional() })`
- Ajouter le type `UpdateCompanyInput` inféré

---

## 3. Agency Settings

**Fichier** : `app/app/settings/agency/_components/GeneralAgencySettings.tsx`

Ajouter une nouvelle `<Card>` **"Informations légales"** sous la card "Profil de l'agence" existante, dans le même `<form>`.

Champs :
| Label | Input | Name |
|---|---|---|
| Raison sociale | `Input` texte | `legal_name` |
| Forme juridique | `Select` (SARL/SAS/SASU/EURL/SA/SNC/Auto-entrepreneur/Autre) | `legal_form` |
| N° RCS / Répertoire des métiers | `Input` texte | `rcs_number` |
| N° TVA intracommunautaire | `Input` texte, placeholder `FR00 000 000 000` | `vat_number` |

Accès : visible uniquement si `role === 'agency_admin'` (garde déjà en place côté page settings).

**Fichier à mettre à jour** : `actions/agency.server.ts` — fonction `updateAgencyInformation`.
Ce fichier contient un `updateAgencySchema` local (lignes 13–19) **distinct** du schema dans `lib/validators/agency.ts`. Pour la cohérence, remplacer le schema local par l'import partagé, et y ajouter les 4 nouveaux champs.

---

## 4. Company : adresse de facturation

**Problème** : il n'existe pas de page/modal d'édition de company, ni d'action `updateCompany`.

**Solution** : créer une action `updateCompanyBillingAddress(id, billing_address)` dans `actions/companies.server.ts` (fichier à créer ou dans le fichier companies existant), et ajouter un bouton "Modifier" dans la page entreprise ou dans la liste pour ouvrir un Dialog minimal avec ce champ.

**Fichiers concernés** :
- `actions/companies.server.ts` (nouveau ou existant) — `updateCompanyBillingAddress`
- `app/app/companies/page.tsx` ou un sous-composant — afficher/éditer `billing_address`

---

## 5. Quote Editor

**Fichier** : `app/app/quotes/[id]/components/QuoteEditor.tsx`

Ajouter 3 champs dans la section métadonnées (aux côtés de `valid_until`, `currency`) :

| Label | Composant | Field |
|---|---|---|
| Date de début de prestation | `Input type="date"` | `service_start_date` |
| Modalités de paiement | `Select` | `payment_terms_preset` |
| Précisions sur le paiement | `Textarea` | `payment_terms_notes` |

Options du Select `payment_terms_preset` :
- Comptant (`immediate`)
- 15 jours (`15_days`)
- 30 jours net (`30_days`)
- 45 jours (`45_days`)
- 60 jours fin de mois (`60_days`)
- Personnalisé (`custom`)

`payment_terms_notes` est **toujours affiché dans l'éditeur** (pas conditionnel), pour permettre de compléter n'importe quelle option avec des détails libres.

Sauvegarde via `updateQuote` avec debounce (pattern existant).

---

## 6. Vue publique du devis (client portal)

**Fichier page** : `app/devis/[token]/page.tsx` (à ne pas confondre avec `/portal/[token]` qui est le portail projet client).

**Fichier action** : `actions/quotes.server.ts` — `getPublicQuote`

Mettre à jour la query pour inclure (ajouts par rapport à l'existant) :
```
agency(name, legal_name, legal_form, rcs_number, vat_number, address, phone, email, logo_url, primary_color, secondary_color)
company(name, billing_address)
```
Note : `address`, `phone`, `email` sont **déjà absents** de la query actuelle — les ajouter en même temps que les champs légaux.

Ajouter `service_start_date, payment_terms_preset, payment_terms_notes` dans le select quotes.

**Affichage** (portal public) :

**Bloc Vendeur** (en-tête devis) :
- Nom commercial + raison sociale si différente
- Forme juridique · RCS · TVA
- Adresse · Téléphone · Email

**Bloc Client** :
- Nom de l'entreprise
- Adresse de facturation si renseignée (affichée uniquement si non nulle)

**Bloc Conditions** (bas de devis) :
- Validité : "Valable jusqu'au [valid_until]"
- Date de début : "[service_start_date]" (affiché uniquement si non null)
- Modalités : libellé humain du preset + `payment_terms_notes` si renseignées (affiché uniquement si non nul)

Note : dans l'éditeur, `payment_terms_notes` est toujours affiché ; dans la vue publique, il est conditionnel (affiché seulement si renseigné) pour ne pas montrer de ligne vide au client.

Les totaux HT, remise, TVA, TTC sont déjà affichés via `computeQuoteTotals`.

---

## Périmètre exclu

- Pas de champs légaux supplémentaires sur le profil `companies` (hors `billing_address`)
- Pas de génération PDF dans ce scope
- Pas de validation format stricte du numéro TVA côté DB (validation Zod côté formulaire uniquement)
