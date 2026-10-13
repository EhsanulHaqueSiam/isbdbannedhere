import { rowsByCategory, type Category, type Row } from './rows.ts'
import { rowState, severity, type Status } from './derive.ts'
import type { FeedEntry, Item } from './index.ts'

// Pure logic behind the sharing tools: "Am I affected?" verdicts per country and purpose (/check, /compare) and the
// week's changes (/week, /share). Server functions in tools-api.ts feed it the real data; tests feed it fixtures.

export const purposes = ['study', 'work', 'visit'] as const
export type Purpose = (typeof purposes)[number]

// What each purpose touches. `null` means the whole entity (every row of a university is about studying).
const touches: Record<Purpose, Partial<Record<Category, readonly Row[] | null>>> = {
  study: { university: null, country: ['student'], city: ['study'] },
  work: { country: ['work'], city: ['work'] },
  visit: { tourism: null, city: ['visit', 'medical'] },
}

type Checkable = Pick<Item, 'category' | 'country' | 'name' | 'nameBn' | 'href'> & { state: Pick<Item['state'], 'status' | 'rows'> }

/** An entry's status for one purpose, or null if the purpose doesn't touch it. */
export function statusFor(item: Checkable, purpose: Purpose): Status | null {
  const rows = touches[purpose][item.category]
  if (rows === undefined) return null
  if (rows === null) return item.state.status
  return worstOf(rows.map((r) => item.state.rows[r]?.status ?? 'none'))
}

export type Verdict = {
  worst: Status
  counts: Record<Status, number>
  total: number
  /** "universities" when every place behind the headline number is a university, else "places". */
  kind: 'university' | 'place'
  /** The worst few, for the result card. */
  top: { name: string; nameBn?: string; status: Status; href: string }[]
}

const zero = (): Record<Status, number> => ({ shut: 0, disputed: 0, restricted: 0, unclear: 0, reopened: 0, none: 0 })

/** Everything a Bangladeshi going to `country` for `purpose` runs into, counted by status. */
export function verdict(items: Checkable[], country: string, purpose: Purpose): Verdict {
  const hits = items.flatMap((i) => {
    const s = i.country === country ? statusFor(i, purpose) : null
    return s ? [{ i, s }] : []
  })
  hits.sort((a, b) => severity[b.s] - severity[a.s] || a.i.name.localeCompare(b.i.name))
  const counts = zero()
  for (const h of hits) counts[h.s]++
  const worst = hits[0]?.s ?? 'none'
  const lead = hits.filter((h) => h.s === worst)
  return {
    worst,
    counts,
    total: hits.length,
    kind: lead.length && lead.every((h) => h.i.category === 'university') ? 'university' : 'place',
    top: hits.filter((h) => h.s !== 'none').slice(0, 3).map((h) => ({ name: h.i.name, nameBn: h.i.nameBn, status: h.s, href: h.i.href })),
  }
}

// ---- the week ----

const worstOf = (list: Status[]) => list.reduce<Status>((a, b) => (severity[b] > severity[a] ? b : a), 'none')

// Fallback when an event can't be replayed (it isn't in the entry's own history).
const actionStatus: Record<Item['events'][number]['action'], Status> = { unavailable: 'shut', paused: 'shut', extended: 'shut', restricted: 'restricted', reopened: 'reopened', denied: 'disputed' }

/**
 * The status an event left the entry in, for headline words on week slides: the entry's history replayed up to the
 * event's date, on the rows it touched. So an extended restriction stays "Restricted.", never "Banned.".
 */
export function statusAfter(item: Pick<Item, 'category' | 'events' | 'id' | 'name' | 'aliases'>, event: Item['events'][number]): Status {
  const day = event.date.length === 4 ? `${event.date}-01-01` : event.date.length === 7 ? `${event.date}-01` : event.date
  const rows = event.rows.length ? (event.rows as Row[]) : rowsByCategory[item.category]
  const s = worstOf(rows.map((r) => rowState(item as Item, r, day).status))
  return s === 'none' ? actionStatus[event.action] : s
}

const dayBefore = (d: string, n: number) => new Date(Date.parse(d) - n * 86_400_000).toISOString().slice(0, 10)

export type Story = {
  date: string
  status: Status
  category: Category
  summary: string
  summaryBn?: string
  publisher?: string
  items: { id: string; name: string; nameBn?: string; country?: string; href: string; category: Category }[]
}

/**
 * Changes reported in the 7 days ending `today`, newest first, as stories: events on the same day with the same
 * effect in the same category are one story ("6 publications restricted"). Month-only dates have no day, so they
 * never count as this week.
 */
export function week(feed: FeedEntry[], today: string, days = 7) {
  const from = dayBefore(today, days - 1)
  const recent = feed.filter(({ event }) => event.date.length === 10 && event.date >= from && event.date <= today)
  return { from, to: today, stories: stories(recent), counts: weekCounts(recent) }
}

function weekCounts(list: FeedEntry[]) {
  const by = (a: string) => list.filter(({ event }) => event.action === a).length
  return { banned: by('paused'), extended: by('extended'), restricted: by('restricted'), reopened: by('reopened') }
}

/** Groups feed entries into stories, newest first, then biggest. */
export function stories(list: FeedEntry[]): Story[] {
  const groups = new Map<string, Story>()
  for (const { item, event } of list) {
    const status = statusAfter(item, event)
    const key = `${event.date}|${status}|${item.category}`
    const lite = { id: item.id, name: item.name, nameBn: item.nameBn, country: item.country, href: item.href, category: item.category }
    const g = groups.get(key)
    if (g) g.items.push(lite)
    else groups.set(key, { date: event.date, status, category: item.category, summary: event.summary, summaryBn: event.summaryBn, publisher: event.sources[0]?.publisher, items: [lite] })
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.items.length - a.items.length)
}
