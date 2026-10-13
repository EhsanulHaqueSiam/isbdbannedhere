import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { countryNames, items, type Item } from './index.ts'
import { severity, type Status } from './derive.ts'
import { rowsByCategory, type Category, type Row } from './rows.ts'
import { countrySlug, hubPath } from '../lib/places.ts'
import { headline, leadRow, statusLabel, type Lang } from '../lib/i18n.ts'
import { num } from '../lib/captions.ts'

// Country hubs (/in/uae): every entry in one country with at least one event, one verdict for the country.
// Built once from the data; the hub page loads one hub through getHub, scripts/seo.ts renders previews and short links.

/** Rows on a hub page: visas first (tourist and work/study entries), then cities, then institutions. */
export type HubGroup = 'visa' | 'city' | 'university' | 'company' | 'publication'
const groupOf = (c: Category): HubGroup => (c === 'tourism' || c === 'country' ? 'visa' : c)
const groupOrder: HubGroup[] = ['visa', 'city', 'university', 'company', 'publication']

/** Worst status in a list, by the same severity an entity uses for its rows. */
export const worst = (statuses: Status[]) => statuses.reduce<Status>((w, s) => (severity[s] > severity[w] ? s : w), 'none')

/** How many entries have each status. */
export const tally = (statuses: Status[]) => {
  const n: Partial<Record<Status, number>> = {}
  for (const s of statuses) n[s] = (n[s] ?? 0) + 1
  return n
}

function entry(i: Item) {
  const all = rowsByCategory[i.category]
  const hit = all.filter((r) => i.state.rows[r]?.status === i.state.status)
  return {
    id: i.id,
    category: i.category,
    href: i.href,
    name: i.name,
    nameBn: i.nameBn,
    city: i.city,
    status: i.state.status,
    since: leadRow(i)?.since,
    // Rows the status applies to; empty when it applies to all of them.
    rows: (hit.length === all.length ? [] : hit) as Row[],
  }
}
export type HubEntry = ReturnType<typeof entry>

const order: Status[] = ['shut', 'disputed', 'restricted', 'unclear', 'reopened']

/**
 * What a hub says, in both languages, so the page, its preview and its share caption read the same.
 * Counts per status, never a stronger word than the data: "4 places in UAE: 3 shut out, 1 restricted."
 */
function words(name: { en: string; bn: string }, status: Status, counts: Partial<Record<Status, number>>, places: number) {
  const parts = (lang: Lang) => order.filter((s) => counts[s]).map((s) => `${num(counts[s]!, lang)}${lang === 'bn' ? 'টি' : ''} ${statusLabel[lang][s].toLowerCase()}`).join(', ')
  const en = { question: `Is BD banned in ${name.en}?`, sentence: `${places} ${places === 1 ? 'place' : 'places'} in ${name.en}: ${parts('en')}.` }
  const bn = { question: `${name.bn}: বাংলাদেশিরা কি নিষিদ্ধ?`, sentence: `${num(places, 'bn')}টি জায়গায় রিপোর্ট: ${parts('bn')}।` }
  return {
    en: { ...en, line: `${en.question} ${headline.en[status]} ${en.sentence}` },
    bn: { ...bn, line: `${bn.question} ${headline.bn[status]} ${bn.sentence}` },
  }
}

/** One hub per country with an event, most entries first. `list` is sorted worst first (index.ts). */
export function buildHubs(list: Item[]) {
  const by = new Map<string, Item[]>()
  for (const i of list) if (i.country && i.events.length) by.set(i.country, [...(by.get(i.country) ?? []), i])
  return [...by]
    .map(([code, its]) => {
      const statuses = its.map((i) => i.state.status)
      const name = countryNames(code), status = worst(statuses), counts = tally(statuses)
      return {
        code,
        slug: countrySlug(code),
        path: hubPath(code),
        name,
        status,
        counts,
        places: its.length,
        text: words(name, status, counts, its.length),
        sources: new Set(its.flatMap((i) => i.events.flatMap((e) => e.sources.map((s) => s.url)))).size,
        groups: groupOrder
          .map((group) => ({ group, entries: its.filter((i) => groupOf(i.category) === group).map(entry) }))
          .filter((g) => g.entries.length),
      }
    })
    .sort((a, b) => b.places - a.places || a.slug.localeCompare(b.slug))
}
export type Hub = ReturnType<typeof buildHubs>[number]

export const hubs = buildHubs(items)

export const getHub = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    setResponseHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
    const hub = hubs.find((h) => h.slug === slug)
    if (!hub) return null
    return { hub, others: hubs.filter((h) => h !== hub).map((h) => ({ code: h.code, slug: h.slug, name: h.name, places: h.places })) }
  })
