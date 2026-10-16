import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { categories, type Category } from './schema.ts'
import { trendFor, categoryOf, counts, countriesNow, countryNames, feed, get, inCategory, items, stillOpen, totals, visaFreeList, type Item } from './index.ts'
import { after, type Status } from './derive.ts'
import { leadRow } from '../lib/i18n.ts'
import { TODAY } from './today.ts'
import press from './press.json' with { type: 'json' }

// Article pictures per source url (scripts/press.ts), only for the sources a page shows.
const pressFor = (i: Item) => Object.fromEntries(i.events.flatMap((e) => e.sources).map((s) => [s.url, (press as Record<string, string>)[s.url] || '']).filter(([, v]) => v))
export { pressFor }

// Data stays on the server; each page gets only what it shows.
// Data only changes with a deploy, so browsers may reuse answers for 5 minutes.
const cacheable = () => setResponseHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')

const lite = (i: Item) => ({ id: i.id, category: i.category, name: i.name, nameBn: i.nameBn, country: i.country, city: i.city, domain: i.domain, href: i.href, status: i.state.status, strip: i.strip, sources: i.conf.sources, since: leadRow(i)?.since })
export type Lite = ReturnType<typeof lite>

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  cacheable()
  const silent = items
    .filter((i) => i.state.status === 'unclear')
    .map((i) => {
      const until = Object.values(i.state.rows).find((r) => r?.status === 'unclear')?.until
      return { ...lite(i), days: until ? Math.round((Date.parse(TODAY) - Date.parse(after(until))) / 86_400_000) : null }
    })
    .filter((i) => i.days !== null && i.days >= 0)
  const tally: Partial<Record<Status, number>> = {}
  for (const i of items) tally[i.state.status] = (tally[i.state.status] ?? 0) + 1
  return {
    totals,
    tracked: items.length,
    tally,
    tiles: categories.map((c) => ({ category: c, ...counts(c) })),
    countries: countriesNow,
    trend: trendFor(items),
    stories: stories(),
    silent,
  }
})

/**
 * Latest news, one entry per story: events with the same date and lead source collapse into a cluster
 * ("25 universities shut out Bangladeshi students"). Only events with a press source count as news;
 * official pages are standing facts and live on category pages.
 */
function stories() {
  const groups = new Map<string, { items: Item[]; event: Item['events'][number] }>()
  for (const { item, event } of feed) {
    if (!event.sources.some((s) => s.tier === 'press')) continue
    const key = `${item.category}|${event.date}|${event.sources[0]?.url}`
    const g = groups.get(key)
    if (g) g.items.push(item)
    else groups.set(key, { items: [item], event })
  }
  return [...groups.values()].slice(0, 6).map(({ items: its, event }) => ({
    date: event.date,
    summary: event.summary,
    summaryBn: event.summaryBn,
    publisher: event.sources[0]?.publisher,
    url: event.sources[0]?.url,
    sources: new Set(its.flatMap((i) => i.events.filter((e) => e.date === event.date).flatMap((e) => e.sources.map((s) => s.url)))).size,
    items: its.map(lite),
    mixed: new Set(its.map((i) => i.state.status)).size > 1,
    // "UK universities" when every place in the story is in one country.
    country: its[0]?.country && its.every((i) => i.country === its[0]?.country) ? countryNames(its[0].country) : undefined,
  }))
}

export const getCategory = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    cacheable()
    const c = categoryOf[slug] as Category | undefined
    if (!c) return null
    return { category: c, counts: counts(c), list: inCategory(c).map(lite), trend: trendFor(inCategory(c)) }
  })

export const getItem = createServerFn({ method: 'GET' })
  .validator((d: { slug: string; id: string }) => d)
  .handler(async ({ data }) => {
    cacheable()
    const c = categoryOf[data.slug] as Category | undefined
    const item = c && get(c, data.id)
    if (!item) return null
    return { item, stillOpen: stillOpen(item), press: pressFor(item) }
  })

export const getMany = createServerFn({ method: 'GET' })
  .validator((keys: string[]) => keys.slice(0, 20))
  .handler(async ({ data }) => {
    cacheable()
    return data.map((k) => { const [c, id] = k.split('/'); return c && id ? get(c as Category, id) : undefined }).filter((i): i is Item => !!i)
  })

/** Compact index for client-side search, fetched when the search box is first used. */
export const getSearchIndex = createServerFn({ method: 'GET' }).handler(async () => {
  cacheable()
  return items.map((i) => ({ ...lite(i), strip: undefined, aliases: i.aliases, domain: i.domain }))
})

export const getAbout = createServerFn({ method: 'GET' }).handler(async () => {
  cacheable()
  return {
  totals,
  visaFree: visaFreeList?.source ?? null,
  corrections: feed.filter(({ event }) => event.action === 'denied' || event.action === 'reopened').slice(0, 20).map(({ item, event }) => ({ item: lite(item), date: event.date, summary: event.summary })),
  }
})
