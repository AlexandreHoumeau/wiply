# Checklist Pré-Lancement Wiply

> Créé le 22 mars 2026 — À compléter avant le lancement public

---

## 1. SERVICES TIERS — CONFIGURATION PRODUCTION

### 🔵 Supabase
- [ ] Vérifier que les variables d'env de prod sont différentes du staging/dev
- [ ] Activer le **Rate Limiting** sur les endpoints Auth (anti-bruteforce)
- [ ] Vérifier que **RLS est activé** sur toutes les tables (profiles, agencies, companies, opportunities, projects, tasks, quotes, quote_items, tracking_links, notifications, ai_generated_messages, agency_ai_configs)
- [ ] Configurer les **redirects d'auth** dans Supabase Dashboard → Auth → URL Configuration :
  - Site URL : `https://wiply.fr`
  - Redirect URLs autorisées : `https://wiply.fr/auth/callback`, `https://wiply.fr/auth/confirm`
- [ ] Désactiver l'**email confirmation automatique Supabase** (on utilise Brevo à la place — vérifier que `generateLink()` n'envoie pas de double email)
- [ ] Planifier la **Edge Function `send-digest`** (cron job Supabase)
- [ ] Vérifier les **backup automatiques** activés sur la base de prod
- [ ] Vérifier les **politiques SMTP** si Supabase envoie des mails (reset password via Supabase vs Brevo)

### 💳 Stripe
- [ ] Passer en mode **Live** (remplacer les clés `sk_test_` par `sk_live_`)
- [ ] Mettre à jour les variables d'env : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Créer le **Product + Price PRO** en mode Live et mettre à jour `STRIPE_PRO_PRICE_ID`
- [ ] Configurer le **Webhook Stripe Live** :
  - Endpoint : `https://wiply.fr/api/webhooks/stripe`
  - Événements à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copier le `STRIPE_WEBHOOK_SECRET` live dans les variables d'env
- [ ] Configurer le **Stripe Customer Portal** (logo, couleurs, options visible/cachées)
- [ ] Activer les **moyens de paiement** souhaités dans Stripe Dashboard (CB, Apple Pay, etc.)
- [ ] Tester un paiement Live avec une vraie carte (puis rembourser)
- [ ] Vérifier les **paramètres fiscaux Stripe** (TVA française si applicable, adresse entreprise)
- [ ] Configurer les **emails de facture Stripe** (logo, adresse entreprise, CGV URL)
- [ ] Vérifier que les **métadonnées `agency_id`** arrivent bien dans le webhook
- [ ] Activer les **alertes Stripe** (fraude, échec de paiement)

### 📧 Brevo (Sendinblue)
- [ ] Vérifier le **domaine `wiply.fr` validé** dans Brevo (SPF, DKIM, DMARC configurés)
- [ ] Tester chaque email transactionnel en production :
  - [ ] Email de confirmation d'inscription
  - [ ] Email de reset de mot de passe
  - [ ] Email d'invitation membre agence
  - [ ] Email de bienvenue newsletter
  - [ ] Email de suppression de compte
  - [ ] Email de digest de notifications
  - [ ] Email quand un membre rejoint
- [ ] Vérifier que les emails arrivent en **boîte principale** (pas spam) — tester avec Gmail, Outlook, Apple Mail
- [ ] Vérifier que le **lien de désabonnement** fonctionne (`/unsubscribe`)
- [ ] Créer une **liste de contact newsletter** dans Brevo si pas déjà fait
- [ ] Vérifier les **quotas d'envoi** du plan Brevo actuel (suffisant pour le lancement ?)
- [ ] Vérifier le footer des emails (adresse physique obligatoire en France)

### 🔴 Sentry
- [ ] Vérifier que `NEXT_PUBLIC_SENTRY_DSN` est bien configuré en prod
- [ ] Vérifier que les **source maps** sont uploadées lors du build
- [ ] Configurer les **alertes Sentry** (seuil d'erreurs, nouvelles issues)
- [ ] Créer les **équipes/membres** dans le projet Sentry
- [ ] Vérifier le tunnel `/monitoring` est accessible en prod

### 📊 PostHog
- [ ] Vérifier que `NEXT_PUBLIC_POSTHOG_KEY` et `NEXT_PUBLIC_POSTHOG_HOST` sont en prod
- [ ] Vérifier les **rewrites `/ingest/`** dans next.config.ts fonctionnent en prod
- [ ] Configurer les **dashboards PostHog** (inscriptions, usage features, conversion FREE→PRO)
- [ ] Vérifier que le **consent RGPD** est géré (opt-out par défaut déjà en place — bien ✓)
- [ ] Configurer les **funnels PostHog** : signup → first opportunity → upgrade

### 🤖 Mistral AI
- [ ] Vérifier que `MISTRAL_API_KEY` est configurée en prod
- [ ] Vérifier les **quotas et limites** du plan Mistral actuel
- [ ] Tester l'analyse de site web en prod (feature PRO)
- [ ] Tester la génération de messages email en prod (feature PRO)

---

## 2. LÉGAL & CONFORMITÉ

### 📄 Documents légaux
- [ ] **Mentions légales** (`/mentions-legales`) : vérifier toutes les infos sont à jour (SIRET, adresse, hébergeur)
- [ ] **CGU** (`/cgu`) : relire, faire valider par un professionnel si possible
- [ ] **Politique de confidentialité** (`/politique-de-confidentialite`) : doit mentionner tous les services (Supabase, Stripe, Brevo, PostHog, Sentry, Mistral)
- [ ] Vérifier que les pages légales sont **accessibles sans connexion**
- [ ] Vérifier les **liens dans le footer** vers les pages légales

### 🍪 RGPD & Cookies
- [ ] Vérifier qu'aucun tracking n'est activé sans consentement (PostHog opt-out par défaut ✓)
- [ ] Ajouter une **bannière cookies** si du tracking opt-in est utilisé
- [ ] Vérifier les **données personnelles stockées** dans Supabase : durée de conservation documentée
- [ ] Vérifier le **droit à l'oubli** : le flow de suppression de compte efface bien toutes les données
- [ ] S'assurer que **Stripe, Brevo, PostHog** sont dans la politique de confidentialité
- [ ] Vérifier que les **emails transactionnels** incluent l'adresse physique de l'entreprise

### 💰 Facturation & TVA
- [ ] Vérifier les champs légaux agence (SIREN, forme juridique, TVA) dans les profils
- [ ] Vérifier le format des **devis** : numérotation, mentions obligatoires
- [ ] Si vente à des particuliers : s'assurer d'appliquer la TVA correctement via Stripe

---

## 3. VARIABLES D'ENVIRONNEMENT PRODUCTION

- [ ] `NEXT_PUBLIC_SUPABASE_URL` → URL Supabase prod
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` → clé anon prod
- [ ] `SUPABASE_SERVICE_ROLE_KEY` → clé service role prod (⚠️ jamais côté client)
- [ ] `STRIPE_SECRET_KEY` → clé live `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → clé live `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` → secret webhook live
- [ ] `STRIPE_PRO_PRICE_ID` → ID du prix live PRO
- [ ] `BREVO_API_KEY` → clé API Brevo prod
- [ ] `MISTRAL_API_KEY` → clé API Mistral prod
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` → clé PostHog prod
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` → `https://eu.posthog.com`
- [ ] `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` → projet Sentry prod
- [ ] `NEXT_PUBLIC_SENTRY_DSN` → DSN Sentry prod
- [ ] `NEXT_PUBLIC_SITE_URL` → `https://wiply.fr`
- [ ] `NODE_ENV` → `production`
- [ ] `PLAYWRIGHT_TEST_MODE` → ne doit **PAS** être `true` en prod

---

## 4. FEATURES À TESTER — PARCOURS COMPLETS

### 🔐 Authentification
- [ ] **Inscription** : créer un compte avec email/mdp → recevoir email de confirmation → cliquer le lien → être connecté
- [ ] **Confirmation email** : tester que le lien de confirmation fonctionne (token_hash)
- [ ] **Connexion** : login avec email/mdp → redirection dashboard
- [ ] **Mot de passe oublié** : demander reset → recevoir email → cliquer lien → définir nouveau mdp → se connecter
- [ ] **Déconnexion** : logout → redirection page de login
- [ ] **Suppression de compte** : supprimer le compte → recevoir email de confirmation → vérifier que les données sont supprimées
- [ ] Tester que les **pages protégées** redirigent vers `/auth/login` si non connecté
- [ ] Tester que les **routes d'admin** ne sont pas accessibles par un `agency_member`

### 💳 Abonnement & Paiement
- [ ] **Upgrade FREE → PRO** : cliquer "Passer au PRO" → arriver sur Stripe Checkout → payer → revenir sur `/app/settings/billing?success=true` → plan PRO actif
- [ ] **Webhook Stripe** : vérifier que l'agence passe bien en `plan='PRO'` dans Supabase après paiement
- [ ] **Portail de gestion** : cliquer "Gérer l'abonnement" → arriver sur Stripe Portal → annuler l'abonnement → revenir → vérifier plan FREE
- [ ] **Downgrade** : après annulation, vérifier que les features PRO sont bien verrouillées
- [ ] **Limites du plan FREE** :
  - [ ] Ne peut pas créer plus de 2 projets
  - [ ] Ne peut pas inviter plus de 1 membre
  - [ ] Limité à 10 tracking links/mois
  - [ ] Pas d'accès aux features IA
  - [ ] Pas d'accès aux devis

### 🏢 Agences & Équipe
- [ ] Créer/modifier le **profil de l'agence**
- [ ] Renseigner les **informations légales** (forme juridique, SIREN, TVA)
- [ ] **Inviter un membre** : envoyer invitation → recevoir email → accepter → accéder au dashboard de l'agence
- [ ] Vérifier les **rôles** : admin vs membre (accès différencié)
- [ ] **Supprimer un membre** de l'agence

### 🏭 Entreprises
- [ ] Créer une entreprise
- [ ] Modifier les informations (adresse de facturation, secteur, etc.)
- [ ] Associer une entreprise à une opportunité
- [ ] Supprimer une entreprise

### 🎯 Opportunités (Pipeline commercial)
- [ ] Créer une opportunité
- [ ] Modifier le **statut** : inbound → to_do → first_contact → ... → won/lost
- [ ] Associer une opportunité à une entreprise
- [ ] Ajouter une opportunité en **favoris**
- [ ] **Analyser le site web** de l'opportunité (feature IA — PRO)
- [ ] **Générer un email** depuis l'IA (feature PRO)
- [ ] Sauvegarder un message IA généré
- [ ] Voir les **analytics** de l'opportunité (clics tracking links)
- [ ] **Convertir en projet**

### 📋 Devis
- [ ] Créer un devis (statut `draft`)
- [ ] Ajouter des **lignes** (fixed, hourly, expense)
- [ ] Appliquer un **discount** (% ou fixe)
- [ ] Configurer la **TVA**
- [ ] Configurer les **conditions de paiement**
- [ ] **Envoyer** le devis → statut `sent`
- [ ] Accéder au **lien public** du devis (`/devis/[token]`) sans être connecté
- [ ] **Accepter / Refuser** le devis depuis la vue publique
- [ ] Vérifier que les **informations légales de l'agence** apparaissent sur le devis
- [ ] Vérifier les **transitions de statut** autorisées
- [ ] Devis **expiré** : vérifier le comportement

### 🚀 Projets & Tâches
- [ ] Créer un projet (depuis une opportunité ou directement)
- [ ] Ajouter des **tâches** avec priorités
- [ ] **Assigner** une tâche à un membre
- [ ] Modifier le **statut** des tâches
- [ ] Ajouter des **versions/itérations**
- [ ] Configurer les URLs (Figma, GitHub, déploiement)
- [ ] Tester le **portail client** (accès public via magic token)
- [ ] Soumettre un fichier via le portail client
- [ ] Basculer la **visibilité du progrès** pour le client

### 🔗 Tracking Links
- [ ] Créer un tracking link
- [ ] Partager le lien → vérifier redirection + comptage des clics
- [ ] Vérifier la **limite de 10 liens/mois** en FREE
- [ ] Vérifier qu'en PRO, la limite est illimitée
- [ ] Tester l'**expiration** d'un lien

### 🔔 Notifications
- [ ] Vérifier que les notifications se créent pour : tâche assignée, clic tracking, soumission portail, membre rejoint
- [ ] Modifier les **préférences de notification** dans les paramètres
- [ ] Vérifier l'**email de digest** (reçu dans l'heure après une notification)
- [ ] Marquer des notifications comme lues

### 📰 Newsletter
- [ ] S'inscrire à la newsletter → recevoir email de bienvenue
- [ ] Se désinscrire via `/unsubscribe` → vérifier suppression de la liste

---

## 5. SÉCURITÉ

- [ ] Vérifier que `PLAYWRIGHT_TEST_MODE` est `false`/non défini en prod (désactive les routes `/api/test/*`)
- [ ] Vérifier que les **routes `/api/test/*`** sont inaccessibles en production (set-session, bootstrap)
- [ ] Vérifier que la **clé service role Supabase** n'est jamais exposée côté client (uniquement dans des Server Actions ou API routes)
- [ ] Vérifier la **validation Zod** sur tous les inputs utilisateur (forms, API routes)
- [ ] Vérifier que les **tokens de devis** (`/devis/[token]`) ne permettent pas d'énumérer d'autres devis
- [ ] Vérifier le **CORS** sur les API routes
- [ ] Vérifier les **headers de sécurité** (CSP, X-Frame-Options, etc.) dans next.config.ts
- [ ] Tester une tentative d'accès à une ressource d'une autre agence → doit être bloqué par RLS

---

## 6. PERFORMANCE & SEO

- [ ] Vérifier les **Core Web Vitals** sur Vercel Analytics ou Lighthouse
- [ ] Vérifier les **meta tags** (title, description) sur les pages publiques
- [ ] Vérifier que le **sitemap** et le **robots.txt** sont configurés
- [ ] Vérifier que les **pages légales** sont indexables
- [ ] Tester la **vitesse de chargement** sur mobile (3G)
- [ ] Vérifier que les **images** sont optimisées (next/image)

---

## 7. DÉPLOIEMENT VERCEL

- [ ] Vérifier que **toutes les variables d'env** sont configurées dans Vercel (pas seulement en local)
- [ ] Vérifier que le **build de prod** passe sans erreur
- [ ] Configurer le **domaine custom** `wiply.fr` sur Vercel
- [ ] Vérifier le **certificat SSL** est actif
- [ ] Vérifier les **redirects/rewrites** PostHog (`/ingest/`) fonctionnent en prod
- [ ] Vérifier le tunnel Sentry `/monitoring` est accessible
- [ ] Configurer les **alertes Vercel** (build failures, outages)
- [ ] Vérifier que la **Edge Function Supabase `send-digest`** est déployée et planifiée

---

## 8. CI/CD & TESTS

- [ ] Vérifier que le **pipeline CI** (vitest) passe sur `main`
- [ ] Vérifier que le **pipeline E2E** (Playwright) passe sur `main`
- [ ] Vérifier que les secrets GitHub Actions sont tous configurés pour l'environnement `test`

---

## 9. AVANT LE J-1

- [ ] Faire un **test bout-en-bout complet** avec un vrai compte, une vraie CB (mode live)
- [ ] Vérifier les **emails reçus** dans une vraie boîte mail
- [ ] Vérifier que Sentry reçoit bien les événements
- [ ] Vérifier que PostHog reçoit bien les events utilisateur
- [ ] Faire un **backup manuel** de la base de données
- [ ] Préparer un **plan de rollback** (que faire si le lancement échoue ?)
- [ ] Tester sur **mobile** (iOS Safari + Android Chrome)
- [ ] Tester sur **différents navigateurs** (Chrome, Firefox, Safari)

---

## PRIORITÉ ABSOLUE (blockers au lancement)

| # | Item | Service |
|---|------|---------|
| 1 | Clés Stripe en mode Live | Stripe |
| 2 | Webhook Stripe configuré en Live | Stripe |
| 3 | Domaine `wiply.fr` validé dans Brevo (SPF/DKIM) | Brevo |
| 4 | Redirects Auth configurés dans Supabase | Supabase |
| 5 | Variables d'env de prod configurées dans Vercel | Vercel |
| 6 | Routes `/api/test/*` désactivées en prod | Sécurité |
| 7 | RLS vérifié sur toutes les tables | Supabase |
| 8 | Pages légales à jour et accessibles | Légal |
