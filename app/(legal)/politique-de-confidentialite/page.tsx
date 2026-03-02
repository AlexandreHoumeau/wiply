import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  robots: { index: false },
}

export default function PolitiqueDeConfidentialite() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Politique de confidentialité</h1>
      <p className="text-slate-500 text-sm">Dernière mise à jour : février 2026</p>

      <p>
        La présente politique de confidentialité décrit la manière dont Wiply collecte,
        utilise et protège vos données personnelles conformément au Règlement général sur la
        protection des données (RGPD — Règlement UE 2016/679).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        [Nom de la société]<br />
        [Adresse]<br />
        Email : <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Données de compte :</strong> adresse email, prénom, nom, mot de passe (haché).</li>
        <li><strong>Données d&apos;agence :</strong> nom, logo, couleurs, site web, téléphone, adresse.</li>
        <li><strong>Données de projets :</strong> contenus, tâches, commentaires, fichiers partagés.</li>
        <li><strong>Données de facturation :</strong> informations de paiement traitées par Stripe (nous ne stockons pas vos coordonnées bancaires).</li>
        <li><strong>Données de navigation :</strong> logs techniques (adresse IP, navigateur) à des fins de sécurité et de débogage.</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fourniture du service (exécution du contrat)</li>
        <li>Facturation et gestion des abonnements (obligation légale)</li>
        <li>Sécurité et prévention des fraudes (intérêt légitime)</li>
        <li>Envoi d&apos;emails transactionnels (exécution du contrat)</li>
      </ul>

      <h2>4. Destinataires des données</h2>
      <p>
        Vos données sont traitées par les sous-traitants suivants, liés par des accords de traitement
        conformes au RGPD :
      </p>
      <ul>
        <li><strong>Supabase</strong> — stockage des données (PostgreSQL, authentification)</li>
        <li><strong>Stripe</strong> — traitement des paiements</li>
        <li><strong>Resend</strong> — envoi d&apos;emails transactionnels</li>
        <li><strong>Vercel</strong> — hébergement de l&apos;application</li>
      </ul>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Données de compte : durée de vie du compte + 3 ans après fermeture.</li>
        <li>Données de facturation : 10 ans (obligation comptable).</li>
        <li>Logs techniques : 12 mois.</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez des droits suivants : accès, rectification,
        effacement, limitation, portabilité et opposition. Pour exercer ces droits, contactez-nous à{' '}
        <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>.
      </p>
      <p>
        Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL
        (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Le site utilise uniquement des cookies techniques nécessaires au fonctionnement
        du service (session d&apos;authentification). Aucun cookie publicitaire ou de tracking
        tiers n&apos;est utilisé.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question relative à vos données :{' '}
        <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>
      </p>
    </article>
  )
}
