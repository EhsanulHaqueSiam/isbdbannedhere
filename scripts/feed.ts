// Post-build: RSS feed of the latest bans, restrictions and reopenings (dist/client/feed.xml), newest first.
// Feed readers and feed-to-channel tools (Telegram, Facebook) can follow new bans without an account.
import { writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'
import { feed, slugOf } from '../src/data/index.ts'
import { headline, placeName } from '../src/lib/i18n.ts'

const SITE = (loadEnv('production', process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const day = (d: string) => new Date(`${d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d}T00:00:00Z`).toUTCString()

const items = feed.slice(0, 60).map(({ item, event }) => {
  const link = `${SITE}/${slugOf[item.category]}/${item.id}`
  const title = `${placeName(item)}: ${headline.en[item.state.status]}`
  return `<item><title>${esc(title)}</title><link>${link}</link><guid isPermaLink="false">${esc(`${item.category}/${item.id}/${event.date}/${event.action}`)}</guid><pubDate>${day(event.date)}</pubDate><description>${esc(event.summary)}</description>${event.sources.map((s) => `<source url="${esc(s.url)}">${esc(s.publisher)}</source>`).slice(0, 1).join('')}</item>`
})
writeFileSync(
  'dist/client/feed.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Is BD banned here?</title><link>${SITE}/</link><description>New bans, restrictions and reopenings for Bangladeshis, each with its sources.</description><language>en</language>${items.join('')}</channel></rss>\n`,
)
console.log(`feed: ${items.length} items`)
