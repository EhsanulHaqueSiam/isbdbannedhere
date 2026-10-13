import { shortName } from './i18n.ts'

// Country hub URLs. One page per country (/in/uae) and a short alias people can say out loud (/uae, a redirect written
// at build by scripts/seo.ts). Slugs come from the short English name, so they never change with a translation.

const regions = new Intl.DisplayNames(['en'], { type: 'region' })

/** "uk", "uae", "usa", "saudi-arabia", "south-korea". */
export const countrySlug = (code: string) =>
  (shortName[code] ?? regions.of(code) ?? code).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const hubPath = (code: string) => `/in/${countrySlug(code)}`
export const shortPath = (code: string) => `/${countrySlug(code)}`
