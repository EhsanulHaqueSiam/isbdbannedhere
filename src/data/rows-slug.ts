import type { Category } from './rows.ts'

// URL segment per category. Kept apart from the data so pages can import it without the dataset.
export const slugOf: Record<Category, string> = {
  university: 'universities',
  company: 'companies',
  city: 'cities',
  publication: 'publications',
  tourism: 'tourism',
  country: 'countries',
}

const slugs = new Set(Object.values(slugOf))

/** Route matching: only real category slugs match $category, so /bn falls through to the Bangla home. */
export const parseCategory = <T extends { category: string }>(p: T): T | false => (slugs.has(p.category) ? p : false)
