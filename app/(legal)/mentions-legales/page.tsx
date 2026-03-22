import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  robots: { index: false },
}

export default function MentionsLegales() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Mentions légales</h1>
      <p className="text-slate-500 text-sm">Dernière mise à jour : février 2026</p>

      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>Wiply</strong> est édité par :<br />
        Alexandre Houmeau<br />
        Micro-entrepreneur<br />
        4 rue Rose, 33300 Bordeaux, France<br />
        SIRET : 91761722700033
        Email : <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Alexandre Houmeau, en qualité de micro-entrepreneur.</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par :<br />
        <strong>Vercel Inc.</strong> — 340 Pine Street, Suite 700, San Francisco, CA 94104, États-Unis<br />
        <strong>Supabase Inc.</strong> (base de données) — 970 Toa Payoh North, Singapour
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus (textes, images, logotypes) présents sur ce site sont la propriété
        exclusive de l&apos;éditeur ou font l&apos;objet d&apos;une licence d&apos;utilisation.
        Toute reproduction, même partielle, est interdite sans autorisation préalable.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question : <a href="mailto:contact@wiply.fr">contact@wiply.fr</a>
      </p>
    </article>
  )
}
