import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wiply.fr'

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/politique-de-confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/cgu`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
  ]
}
