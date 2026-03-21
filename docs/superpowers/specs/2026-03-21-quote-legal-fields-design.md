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

Toutes les nouvelles colonnes sont nullable pour ne pas bloquer les devis existants.

---

## 2. Validators & Types

### `lib/validators/agency.ts`
- Ajouter `legal_name`, `legal_form`, `rcs_number`, `vat_number` à `updateAgencySchema` (tous optionnels)
- Étendre le type `Agency` avec ces 4 champs (nullable)
- Ajouter `legalFormSchema` : `z.enum(['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'Auto-entrepreneur', 'Autre'])`

### `lib/validators/quotes.ts`
- Ajouter `service_start_date`, `payment_terms_preset`, `payment_terms_notes` à `QuoteSchema` (tous optionnels/nullable)
- `payment_terms_preset` : `z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom']).nullable()`
- `UpdateQuoteSchema` et `CreateQuoteSchema` mis à jour automatiquement via `.partial()` / `.omit()`

### `lib/validators/companies.ts`
- Ajouter `billing_address: z.string().optional().nullable()` au schema company existant

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
| N° TVA intracommunautaire | `Input` texte | `vat_number` |

Accès : visible uniquement si `role === 'agency_admin'` (garde déjà en place côté page settings).

L'action `updateAgency` dans `actions/settings.server.ts` est mise à jour pour persister ces champs.

---

## 4. Quote Editor

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

`payment_terms_notes` est toujours affiché (pas conditionnel), pour permettre de compléter n'importe quelle option.

Sauvegarde via `updateQuote` avec debounce (pattern existant).

---

## 5. Vue publique du devis (client portal)

**Fichier** : `actions/quotes.server.ts` — `getPublicQuote`

Mettre à jour la query pour inclure :
```
agency(name, legal_name, legal_form, rcs_number, vat_number, address, phone, email, logo_url, primary_color, secondary_color)
company(name, billing_address)
```

Et ajouter `service_start_date, payment_terms_preset, payment_terms_notes` dans le select quotes.

**Affichage** (portal public) :

**Bloc Vendeur** (en-tête devis) :
- Nom commercial + raison sociale si différente
- Forme juridique · RCS · TVA
- Adresse · Téléphone · Email

**Bloc Client** :
- Nom de l'entreprise
- Adresse de facturation (si renseignée), sinon mention absente

**Bloc Conditions** (bas de devis) :
- Validité : "Valable jusqu'au [valid_until]"
- Date de début : "[service_start_date]" (si renseignée)
- Modalités : libellé du preset + notes si renseignées

Les totaux HT, remise, TVA, TTC sont déjà affichés via `computeQuoteTotals`.

---

## Périmètre exclu

- Pas de champs légaux sur le profil `companies` (hors `billing_address`) — les coordonnées complètes du client ne sont pas gérées dans Wiply
- Pas de génération PDF dans ce scope
- Pas de validation format stricte du numéro TVA côté DB (validation Zod uniquement)
