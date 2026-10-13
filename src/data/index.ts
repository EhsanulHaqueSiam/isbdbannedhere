import { type } from 'arktype'
import { categories, Entity, VisaFree, type Category } from './schema.ts'
import { confidence, entityState, monthStrip, months, severity, type Confidence, type EntityState, type Status } from './derive.ts'

import { TODAY } from './today.ts'
export { TODAY }

import { slugOf } from './rows-slug.ts'
export { slugOf }
export const categoryOf = Object.fromEntries(Object.entries(slugOf).map(([c, s]) => [s, c])) as Record<string, Category>

export type Item = Entity & { state: EntityState; strip: Status[]; conf: Confidence; href: string }

const raw = import.meta.glob<unknown>('../../data/*.json', { eager: true, import: 'default' })
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
  categories: categories.filter((c) => inCategory(c).some(reported)).length,
}

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
