// Public origin for absolute links in previews (Facebook needs absolute og:image URLs). Set in .env.production.
export const SITE = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '')

/** Prebuilt share image path for an entity and format (written by scripts/cards.ts). */
export const cardPath = (category: string, id: string, format: string) => `/cards/${category}-${id}-${format}.jpg`
