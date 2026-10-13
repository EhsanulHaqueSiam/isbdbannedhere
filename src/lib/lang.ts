import { useParams } from '@tanstack/react-router'
import type { Lang } from './i18n.ts'

/** English by default; Bangla when the URL starts with /bn. */
export function useLang(): Lang {
  const p = useParams({ strict: false }) as { lang?: string }
  return p.lang === 'bn' ? 'bn' : 'en'
}

/** Value for the optional {-$lang} route param. */
export const langParam = (lang: Lang) => (lang === 'bn' ? 'bn' : undefined)
