import { createServerFn } from '@tanstack/react-start'
import { categories, type Category } from './schema.ts'
import { categoryOf, closedOverTime, counts, feed, get, inCategory, items, reported, stillOpen, totals, visaFreeList, type Item } from './index.ts'
import { after } from './derive.ts'
import { TODAY } from './today.ts'

// Data stays on the server; each page gets only what it shows.

const lite = (i: Item) => ({ id: i.id, category: i.category, name: i.name, nameBn: i.nameBn, country: i.country, city: i.city, href: i.href, status: i.state.status, strip: i.strip, sources: i.conf.sources })
export type Lite = ReturnType<typeof lite>

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const silent = items
    .filter((i) => i.state.status === 'unclear')
    .map((i) => {
      const until = Object.values(i.state.rows).find((r) => r?.status === 'unclear')?.until
      return { ...lite(i), days: until ? Math.round((Date.parse(TODAY) - Date.parse(after(until))) / 86_400_000) : null }
    })
    .filter((i) => i.days !== null && i.days >= 0)
  return {
    totals,
    tiles: categories.map((c) => ({ category: c, ...counts(c) })),
    flags: [...new Set(items.filter(reported).map((i) => i.country).filter(Boolean))].slice(0, 8) as string[],
    chart: closedOverTime,
    feed: feed.slice(0, 8).map(({ item, event }) => ({ item: lite(item), date: event.date, summary: event.summary, summaryBn: event.summaryBn, action: event.action, sources: event.sources.length, publisher: event.sources[0]?.publisher })),
    silent,
  }
})

export const getCategory = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const c = categoryOf[slug] as Category | undefined
    if (!c) return null
    return { category: c, counts: counts(c), list: inCategory(c).map(lite) }
  })

export const getItem = createServerFn({ method: 'GET' })
  .validator((d: { slug: string; id: string }) => d)
  .handler(async ({ data }) => {
    const c = categoryOf[data.slug] as Category | undefined
    const item = c && get(c, data.id)
    if (!item) return null
    return { item, stillOpen: stillOpen(item) }
  })

export const getMany = createServerFn({ method: 'GET' })
  .validator((keys: string[]) => keys.slice(0, 20))
  .handler(async ({ data }) => data.map((k) => { const [c, id] = k.split('/'); return c && id ? get(c as Category, id) : undefined }).filter((i): i is Item => !!i))

/** Compact index for client-side search, fetched when the search box is first used. */
export const getSearchIndex = createServerFn({ method: 'GET' }).handler(async () =>
  items.map((i) => ({ ...lite(i), strip: undefined, aliases: i.aliases, domain: i.domain })),
)

export const getAbout = createServerFn({ method: 'GET' }).handler(async () => ({
  totals,
  visaFree: visaFreeList?.source ?? null,
  corrections: feed.filter(({ event }) => event.action === 'denied' || event.action === 'reopened').slice(0, 20).map(({ item, event }) => ({ item: lite(item), date: event.date, summary: event.summary })),
}))
