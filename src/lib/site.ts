// Public origin for absolute links in previews (Facebook needs absolute og:image URLs). Set in .env.production.
// `?.` because plain Node (scripts/seo.ts) has no import.meta.env.
export const SITE = ((import.meta.env?.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '')

/** Prebuilt share image path for an entity and format (written by scripts/cards.ts). */
export const cardPath = (category: string, id: string, format: string) => `/cards/${category}-${id}-${format}.jpg`

/** Link-preview image for the home page, a category, or an entry. Written at build by scripts/seo.ts. */
export const ogImage = (slug?: string, id?: string) => `/og/${slug ? (id ? `${slug}/${id}` : slug) : 'home'}.png`

type Seo = {
  /** English path of the page; the Bangla twin is the same path under /bn. */
  path: string
  lang: 'en' | 'bn'
  title: string
  description: string
  /** What a shared link says, when it should differ from the search title. */
  ogTitle?: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: object[]
}

/**
 * Head tags for one page: title, description, canonical, en/bn alternates, Open Graph and JSON-LD.
 * Every route's head() returns this, so no page ships without a preview image or a canonical URL.
 */
export function seo({ path, lang, title, description, ogTitle = title, image = ogImage(), type = 'website', jsonLd = [] }: Seo) {
  const bn = path === '/' ? '/bn' : `/bn${path}`
  const url = `${SITE}${lang === 'bn' ? bn : path}`
  // Bangla pages preview in Bangla: scripts/seo.ts writes an /og/bn/ twin of every /og/ image.
  if (lang === 'bn') image = image.replace(/^\/og\//, '/og/bn/')
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: ogTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { property: 'og:locale', content: lang === 'bn' ? 'bn_BD' : 'en_GB' },
      { property: 'og:image', content: `${SITE}${image}` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: ogTitle },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hrefLang: 'en', href: `${SITE}${path}` },
      { rel: 'alternate', hrefLang: 'bn', href: `${SITE}${bn}` },
      { rel: 'alternate', hrefLang: 'x-default', href: `${SITE}${path}` },
    ],
    scripts: jsonLd.map((j) => ({ type: 'application/ld+json', children: JSON.stringify(j) })),
  }
}

/** schema.org breadcrumb trail, Home first. */
export const breadcrumbs = (trail: [name: string, path: string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [['Is BD banned here?', '/'] as const, ...trail].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path}` })),
})
