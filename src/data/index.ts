import { type } from 'arktype'
import { Entity, VisaFree, type Category } from './schema.ts'
import { confidence, entityState, monthStrip, months, severity, type Confidence, type EntityState, type Status } from './derive.ts'

import { TODAY } from './today.ts'
export { TODAY }
import { shortName, type Lang } from '../lib/i18n.ts'

import { slugOf } from './rows-slug.ts'
export { slugOf }
export const categoryOf = Object.fromEntries(Object.entries(slugOf).map(([c, s]) => [s, c])) as Record<string, Category>

export type Item = Entity & { state: EntityState; strip: Status[]; conf: Confidence; href: string }

// Explicit imports, not import.meta.glob, so plain Node (scripts/seo.ts) loads the same data. New file? Add it here.
import universities from '../../data/universities.json' with { type: 'json' }
import universitiesWorld from '../../data/universities-world.json' with { type: 'json' }
import companies from '../../data/companies.json' with { type: 'json' }
import cities from '../../data/cities.json' with { type: 'json' }
import publications from '../../data/publications.json' with { type: 'json' }
import tourism from '../../data/tourism.json' with { type: 'json' }
import countries from '../../data/countries.json' with { type: 'json' }
import visaFreeJson from '../../data/visa-free.json' with { type: 'json' }

const raw: Record<string, unknown> = {
  'universities.json': universities,
  'universities-world.json': universitiesWorld,
  'companies.json': companies,
  'cities.json': cities,
  'publications.json': publications,
  'tourism.json': tourism,
  'countries.json': countries,
  'visa-free.json': visaFreeJson,
}
const problems: string[] = []
const seen = new Set<string>()
const all: Item[] = []
let visaFree: VisaFree | null = null

for (const [path, json] of Object.entries(raw)) {
  if (path.endsWith('visa-free.json')) {
    const v = VisaFree(json)
    if (v instanceof type.errors) problems.push(`${path}: ${v.summary}`)
    else visaFree = v
    continue
  }
  if (!Array.isArray(json)) {
    problems.push(`${path}: not an array`)
    continue
  }
  for (const item of json) {
    const e = Entity(item)
    if (e instanceof type.errors) {
      problems.push(`${path} ${(item as { id?: string })?.id ?? '?'}: ${e.summary}`)
      continue
    }
    const key = `${e.category}/${e.id}`
    if (seen.has(key)) continue
    seen.add(key)
    all.push({ ...e, state: entityState(e, TODAY), strip: monthStrip(e, TODAY), conf: confidence(e), href: `/${slugOf[e.category]}/${e.id}` })
  }
}
if (problems.length) console.warn(`[data] skipped ${problems.length} invalid entries:\n${problems.slice(0, 30).join('\n')}`)

const bySeverity = (a: Item, b: Item) => severity[b.state.status] - severity[a.state.status] || a.name.localeCompare(b.name)

export const items = all.sort(bySeverity)
export const visaFreeList = visaFree
export const reported = (i: Item) => i.state.status !== 'none'

export function inCategory(c: Category) {
  return items.filter((i) => i.category === c)
}

export function get(c: Category, id: string) {
  return items.find((i) => i.category === c && i.id === id)
}

export function counts(c: Category) {
  const list = inCategory(c)
  const by = (s: Status) => list.filter((i) => i.state.status === s).length
  return { total: list.length, reported: list.filter(reported).length, shut: by('shut'), restricted: by('restricted'), unclear: by('unclear'), disputed: by('disputed'), reopened: by('reopened') }
}

export const totals = {
  places: items.filter((i) => i.state.status !== 'none' && i.state.status !== 'reopened').length,
  reopened: items.filter((i) => i.state.status === 'reopened').length,
  sources: new Set(items.flatMap((i) => i.events.flatMap((e) => e.sources.map((s) => s.url)))).size,
}

// Country names from the data ("Hong Kong", where Intl says "Hong Kong SAR China" or Safari "China mainland"),
// resolved here on the server and sent as strings, so the server and every browser render the same name.
const regions = { en: new Intl.DisplayNames(['en'], { type: 'region' }), bn: new Intl.DisplayNames(['bn'], { type: 'region' }) }
const countryEntity = new Map(items.filter((i) => (i.category === 'tourism' || i.category === 'country') && i.country).map((i) => [i.country!, i]))
export function countryName(code: string, lang: Lang = 'en') {
  const e = countryEntity.get(code)
  return lang === 'en' ? (shortName[code] ?? e?.name ?? regions.en.of(code) ?? code) : (e?.nameBn ?? regions.bn.of(code) ?? code)
}
export const countryNames = (code: string) => ({ en: countryName(code), bn: countryName(code, 'bn') })

/** Every country with a place that bans or restricts Bangladeshis now, most places first. Global companies have no country. */
export const countriesNow = (() => {
  const n = new Map<string, number>()
  for (const i of items) if (i.country && ['shut', 'restricted', 'disputed', 'unclear'].includes(i.state.status)) n.set(i.country, (n.get(i.country) ?? 0) + 1)
  return [...n].map(([code, count]) => ({ code, count, name: countryNames(code) })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
})()

export type TrendPoint = { month: string; closed: number; bans: number; reopened: number }

/**
 * Per month: places closed at month end (line), new bans and reopenings reported that month (bars).
 * Standing "unavailable" facts are not news, so they never count as a new ban.
 */
export function trendFor(list: Item[]): TrendPoint[] {
  return months(TODAY).map((m, i) => {
    const evs = list.flatMap((it) => it.events.filter((e) => e.date.slice(0, 7) === m))
    return {
      month: m,
      closed: list.filter((it) => ['shut', 'restricted', 'disputed'].includes(it.strip[i] ?? 'none')).length,
      bans: evs.filter((e) => e.action === 'paused' || e.action === 'restricted' || e.action === 'extended').length,
      reopened: evs.filter((e) => e.action === 'reopened').length,
    }
  })
}

export type FeedEntry = { item: Item; event: Item['events'][number] }
// News only: 'unavailable' entries are standing facts, not events that happened.
export const feed: FeedEntry[] = items
  .flatMap((item) => item.events.filter((e) => e.action !== 'unavailable').map((event) => ({ item, event })))
  .sort((a, b) => b.event.date.localeCompare(a.event.date))

/** Legal alternatives: curated first, then neighbours in the same category and country with no reports. */
export function stillOpen(item: Item): { name: string; note?: string; href?: string }[] {
  if (item.stillOpen?.length) return item.stillOpen
  if (item.category === 'tourism' && visaFree)
    return visaFree.destinations.slice(0, 5).map((d) => ({ name: d.name, note: d.access === 'visa-free' ? 'Visa-free' : d.access === 'voa' ? 'Visa on arrival' : 'eVisa' }))
  return items
    .filter((o) => o.category === item.category && o.id !== item.id && o.country === item.country && o.state.status === 'none')
    .slice(0, 3)
    .map((o) => ({ name: o.name, note: 'No reports', href: o.href }))
}
