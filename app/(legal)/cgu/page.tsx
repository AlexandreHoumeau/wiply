import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation',
  robots: { index: false },
}

export default function CGU() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="text-slate-500 text-sm">Dernière mise à jour : février 2026</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU régissent l&apos;accès et l&apos;utilisation de la plateforme Wiply,
        disponible à l&apos;adresse <strong>wiply.fr</strong>, éditée par [Nom de la société].
        Toute utilisation du service implique l&apos;acceptation pleine et entière des présentes CGU.
      </p>

      <h2>2. Accès au service</h2>
      <p>
        Wiply est accessible après création d&apos;un compte. L&apos;accès est réservé aux
        professionnels (agences, freelances et leurs clients). L&apos;utilisateur s&apos;engage à fournir
        des informations exactes lors de l&apos;inscription.
      </p>

      <h2>3. Plans et fonctionnalités</h2>
      <ul>
        <li>
          <strong>Plan Testeur (gratuit) :</strong> limité à 2 projets et 1 membre. Sans accès aux
          fonctionnalités IA.
        </li>
        <li>
          <strong>Plan Agence Pro (39 €/mois HT) :</strong> projets et membres illimités (dans les
          limites techniques), accès aux fonctionnalités IA.
        </li>
      </ul>
      <p>Les tarifs sont indiqués hors taxes. La TVA applicable sera ajoutée selon votre pays.</p>

      <h2>4. Obligations de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur s&apos;engage à :</p>
      <ul>
        <li>Ne pas utiliser le service à des fins illicites ou frauduleuses.</li>
        <li>Ne pas tenter de contourner les limites du plan souscrit.</li>
        <li>Respecter les droits des tiers, notamment les droits de propriété intellectuelle.</li>
        <li>Maintenir la confidentialité de ses identifiants de connexion.</li>
      </ul>

      <h2>5. Facturation et résiliation</h2>
      <p>
        L&apos;abonnement Pro est facturé mensuellement via Stripe. Il peut être résilié à tout
        moment depuis les paramètres de facturation. La résiliation prend effet à la fin de la
        période en cours — aucun remboursement prorata n&apos;est effectué.
      </p>
      <p>
        En cas de résiliation, le compte repasse automatiquement sur le plan Testeur et les
        données sont conservées pendant 30 jours avant suppression.
      </p>

      <h2>6. Disponibilité du service</h2>
      <p>
        Nous nous efforçons de garantir une disponibilité maximale du service. Des interruptions
        ponctuelles peuvent survenir pour maintenance. Nous ne saurions être tenus responsables
        des interruptions dues à des causes extérieures (hébergeur, fournisseur tiers).
      </p>

      <h2>7. Limitation de responsabilité</h2>
      <p>
        Wiply est fourni « en l&apos;état ». L&apos;éditeur ne saurait être tenu responsable
        des pertes de données, pertes d&apos;exploitation ou tout dommage indirect découlant de
        l&apos;utilisation du service.
      </p>

      <h2>8. Modification des CGU</h2>
      <p>
        L&apos;éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les
        utilisateurs seront informés par email en cas de modification substantielle. La poursuite
        de l&apos;utilisation du service vaut acceptation des nouvelles conditions.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige sera soumis à la
        compétence des tribunaux du ressort du siège de l&apos;éditeur.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>
      </p>
    </article>
  )
}
