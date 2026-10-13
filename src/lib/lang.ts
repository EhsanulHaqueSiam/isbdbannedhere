import { useParams } from '@tanstack/react-router'
import type { Lang } from './i18n.ts'

/** English by default; Bangla when the URL starts with /bn. For head() and loaders, which get params, not hooks. */
export const langOf = (p: { lang?: string }): Lang => (p.lang === 'bn' ? 'bn' : 'en')

export function useLang(): Lang {
  return langOf(useParams({ strict: false }) as { lang?: string })
}

/** Value for the optional {-$lang} route param. */
export const langParam = (lang: Lang) => (lang === 'bn' ? 'bn' : undefined)
