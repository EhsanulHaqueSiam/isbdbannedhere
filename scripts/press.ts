// Fetches each source article's og:image into src/data/press.json (url -> image url), so link posts on entry pages
// can show the article's own picture, credited to the publisher (DESIGN.md: only on the page, never on share cards).
// Only sources already in data/*.json are read, so a picture appears once a receipt is approved. Run: pnpm press
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { entities } from './entities.ts'

const OUT = 'src/data/press.json'
const known: Record<string, string> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
type Raw = { events?: { sources: { url: string }[] }[] }
const urls = [...new Set((entities() as Raw[]).flatMap((e) => (e.events ?? []).flatMap((ev) => ev.sources.map((s) => s.url))))]
const todo = urls.filter((u) => !(u in known))
let found = 0
await Promise.all(
  todo.map(async (u) => {
    const html = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; isbdbannedhere press)' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('html') ? res.text() : ''))
      .then((t) => t.slice(0, 300_000))
      .catch(() => '')
    if (!html) return (known[u] = '')
    const img = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image/i)?.[1]
    known[u] = img && /^https?:\/\//.test(img) ? img : ''
    if (known[u]) found++
  }),
)
writeFileSync(OUT, JSON.stringify(known, null, 1) + '\n')
console.log(`press: ${found} new images, ${Object.values(known).filter(Boolean).length} of ${urls.length} sources have one`)
