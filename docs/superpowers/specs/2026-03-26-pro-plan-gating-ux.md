# Spec — Pro Plan Gating UX

**Date:** 2026-03-26
**Status:** Approved

## Objectif

Rendre visible et cohérent le verrouillage des fonctionnalités PRO pour les utilisateurs FREE :
1. Sidebar : indicateurs visuels sur les items gated + bloc upgrade persistant
2. Composant `<ProPageGate>` réutilisable pour les lock screens de pages
3. Correction des triggers manquants qui n'ouvraient pas le modal upgrade

## Audit — État avant implémentation

| Feature | Backend | Frontend avant | Statut |
|---|---|---|---|
| Devis (`/app/quotes`) | ✅ checkQuoteEnabled | ✅ Lock screen inline + badge sidebar mort | Partiel |
| Création projet (>2) | ✅ checkProjectLimit | ✅ openUpgradeDialog | OK |
| Génération messages IA | ✅ checkAiEnabled | ✅ openUpgradeDialog | OK |
| Analyse site web IA | ✅ checkAiEnabled | ✅ openUpgradeDialog | OK |
| Invitation collaborateurs | ✅ checkMemberLimit | ❌ toast.error seulement | Manquant |
| Liens tracking (>10/mois) | ✅ checkTrackingLinkLimit | ❌ toast.error seulement | Manquant |
| Config IA (`/app/agency/(config)/ai`) | ⚠️ Pas de check | ❌ Accessible aux FREE | Manquant |

## Design

### 1. Sidebar — `components/app-sidebar.tsx`

#### Items gated (Style C)

Le composant `NavItem` reçoit déjà une prop `locked`. Quand `locked === true` :

- **Apparence** : fond amber subtil (`bg-amber-50/60 border border-amber-200/60`), icône à opacité réduite, badge "PRO" orange à droite
- **Comportement** : `<button>` (non plus `<div>`) qui appelle `openUpgradeDialog(reason, agencyId)` via `useUpgradeDialog()`
- **Version collapsed** : icône cadenas (`Lock`) en tooltip à la place du badge PRO
- Seul "Devis" est actuellement `proOnly: true` dans `mainNav`

`NavItem` doit recevoir `agencyId` pour pouvoir appeler `openUpgradeDialog`.

#### Bloc upgrade FREE

Visible uniquement si `!isProPlan(agency)`, positionné entre la nav et le footer utilisateur.

- **Version étendue** : gradient dark (slate-900 → blue-900), badge "PLAN FREE", bouton "⚡ Passer au PRO — 39€/mois" qui appelle `createCheckoutSession`
- **Version collapsed** : bouton icône `⚡` avec tooltip "Passer au PRO"
- Disparaît automatiquement quand l'agence passe PRO (via `isProPlan(agency)`)
- Utilise `useTransition` pour le loading state du checkout

### 2. Composant `<ProPageGate>`

**Fichier :** `components/pro-page-gate.tsx`

```ts
type Props = {
  feature: 'quotes' | 'ai'
}
```

Composant client (`'use client'`) qui affiche un lock screen centré :
- Icône `Lock` dans un carré en pointillés
- Titre "Fonctionnalité PRO"
- Description selon `feature` :
  - `quotes` : "Créez des propositions commerciales professionnelles avec le plan PRO."
  - `ai` : "Configurez et utilisez l'agent IA avec le plan PRO."
- Bouton `<Button>` → `router.push('/app/agency/billing')`
- Classe `min-h-[60vh]` pour centrer verticalement

**Usages :**
- `app/app/quotes/page.tsx` : remplace le lock screen inline (lignes 65-82) par `<ProPageGate feature="quotes" />`
- `app/app/agency/(config)/ai/page.tsx` : ajoute check `isProPlan` au début du composant serveur + retourne `<ProPageGate feature="ai" />` si FREE

### 3. Triggers manquants

#### a) `AgencyTeamCard` — `app/app/agency/_components/AgencyTeamCard.tsx`

- Ajouter `agencyId: string` aux props du composant
- Ajouter `useUpgradeDialog()` dans le composant
- Dans le handler de `inviteTeamMember` : quand l'action retourne une erreur de limite membre, appeler `openUpgradeDialog(reason, agencyId)` au lieu de `toast.error`
- La prop `agencyId` est disponible dans le composant parent (settings page)

#### b) `TrackingLinksManager` — `app/app/opportunities/[slug]/_components/TrackingLinksManager.tsx`

- `agencyId` est déjà une prop existante du composant
- Ajouter `useUpgradeDialog()` dans le composant
- Dans `handleCreateLink` : quand `createTrackingLink` retourne `allowed: false` ou une erreur de limite, appeler `openUpgradeDialog(reason, agencyId)` au lieu de `toast.error`

## Fichiers touchés

| Fichier | Action |
|---|---|
| `components/app-sidebar.tsx` | Refonte NavItem locked + bloc upgrade FREE |
| `components/pro-page-gate.tsx` | Nouveau composant |
| `app/app/quotes/page.tsx` | Remplace lock screen inline |
| `app/app/agency/(config)/ai/page.tsx` | Ajoute check plan + ProPageGate |
| `app/app/agency/_components/AgencyTeamCard.tsx` | Fix trigger upgrade dialog |
| `app/app/opportunities/[slug]/_components/TrackingLinksManager.tsx` | Fix trigger upgrade dialog |

## Non inclus dans ce scope

- Modifier le design de `UpgradeDialogProvider` (modal existante conservée telle quelle)
- Ajouter de nouvelles features PRO
- Modifier la logique billing/Stripe
