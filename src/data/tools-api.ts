import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { countriesNow, countryNames, feed, items } from './index.ts'
import { purposes, stories, verdict, week, type Purpose, type Story, type Verdict } from './tools.ts'
import { TODAY } from './today.ts'

// Server functions for the sharing tools. Same rule as api.ts: data stays on the server, pages get what they show.
const cacheable = () => setResponseHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')

/** Every country with an entry, most banned first, with its verdict for study, work and visit. Feeds /check and /compare. */
export const getVerdicts = createServerFn({ method: 'GET' }).handler(async () => {
  cacheable()
  const rank = new Map(countriesNow.map((c, k) => [c.code, k]))
  const codes = [...new Set(items.flatMap((i) => (i.country ? [i.country] : [])))]
  return codes
    .map((code) => ({ code, name: countryNames(code), verdicts: Object.fromEntries(purposes.map((p) => [p, verdict(items, code, p)])) as Record<Purpose, Verdict> }))
    .filter((c) => purposes.some((p) => c.verdicts[p].total))
    .sort((a, b) => (rank.get(a.code) ?? 999) - (rank.get(b.code) ?? 999) || a.name.en.localeCompare(b.name.en))
})
export type CountryVerdicts = Awaited<ReturnType<typeof getVerdicts>>[number]

/** "UK" when every place in a story is in one country. */
const placed = (s: Story) => {
  const c = s.items[0]?.country
  return { ...s, place: c && s.items.every((i) => i.country === c) ? countryNames(c) : undefined }
}
export type PlacedStory = ReturnType<typeof placed>

/** This week's changes (/week) and the latest stories for group admins (/share). */
export const getWeek = createServerFn({ method: 'GET' }).handler(async () => {
  cacheable()
  const w = week(feed, TODAY)
  return { from: w.from, to: w.to, counts: w.counts, stories: w.stories.map(placed), latest: stories(feed).slice(0, 6).map(placed) }
})
