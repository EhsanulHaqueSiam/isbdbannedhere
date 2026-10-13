import { items } from './index.ts'
import { normalizeUrl } from '../lib/url.ts'
import { snapVerdicts, type Verdict } from './snap.ts'

// Daily news watcher, run by the cron in wrangler.jsonc (see src/server.ts). It searches Google News for new bans on
// Bangladeshis, has SubQ Snap pick the likely ones and queues them in the receipts table (origin 'watcher') for the same
// daily review as reader links. It never edits data or changes a page.

const queries: [q: string, lang: 'en' | 'bn'][] = [
  ['Bangladeshi visa (suspended OR suspends OR ban OR halted OR restricted OR stopped)', 'en'],
  ['Bangladeshi students (university OR universities) (suspend OR pause OR stop OR restrict OR halt)', 'en'],
  ['Bangladeshi workers (visa OR "labour market" OR "work permit") (ban OR suspend OR closed OR halt)', 'en'],
  ['"Bangladeshi nationals" OR "Bangladeshi passport" (ban OR restrict OR suspend OR deny)', 'en'],
  ['Bangladeshis visa (reopens OR resumes OR lifted OR restored)', 'en'],
  ['বাংলাদেশি ভিসা বন্ধ', 'bn'],
  ['বাংলাদেশি শিক্ষার্থী ভর্তি বন্ধ', 'bn'],
]
const MAX_PER_RUN = 15

export type Story = { url: string; title: string; publisher: string; published?: string }

const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
/** Plain text from RSS or HTML text: CDATA unwrapped, named and numeric entities decoded. */
export const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(e[1] === 'x' ? 2 : 1), e[1] === 'x' ? 16 : 10)) : (named[e] ?? m)))
const fold = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Stories from a Google News RSS page. Links are Google redirect URLs; the review swaps in the publisher's own. */
export function parseRss(xml: string): Story[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, it = '']) => {
      const tag = (n: string) => it.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`))?.[1]?.trim()
      const publisher = decode(tag('source') ?? '')
      const title = decode(tag('title') ?? '')
      const when = tag('pubDate')
      return {
        url: tag('link') ?? '',
        // Google appends " - Publisher" to every title.
        title: publisher && title.endsWith(` - ${publisher}`) ? title.slice(0, -publisher.length - 3) : title,
        publisher,
        published: when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString().slice(0, 10) : undefined,
      }
    })
    .filter((s) => s.url && s.title)
}

/** Headlines that name Bangladesh and aren't a story the site already cites. Cheap, before any AI call. */
export function candidates(stories: Story[], known: Set<string>): Story[] {
  const seen = new Set<string>()
  return stories.filter((s) => {
    const k = fold(s.title)
    if (seen.has(k) || known.has(k) || !/bangladesh|বাংলাদেশ/i.test(s.title)) return false
    seen.add(k)
    return true
  })
}

/** SubQ Snap sorts the headlines, 16 per call; only confident bans, restrictions and reopenings are kept. */
async function classify(key: string, list: Story[]): Promise<{ story: Story; verdict: Verdict }[]> {
  const out: { story: Story; verdict: Verdict }[] = []
  for (let i = 0; i < list.length; i += 16) {
    const batch = list.slice(i, i + 16)
    const verdicts = await snapVerdicts(key, batch.map((s) => `${s.title} (${s.publisher})`))
    batch.forEach((story, k) => verdicts[k] !== 'none' && out.push({ story, verdict: verdicts[k]! }))
  }
  return out
}

/** One run: search, filter, classify, queue. Returns counts for the log. */
export async function watchNews() {
  const { env } = await import('cloudflare:workers')
  if (!env.DB || !env.SUBQ_API_KEY) return { error: 'needs the DB binding and the SUBQ_API_KEY secret' }
  const stories: Story[] = []
  for (const [q, lang] of queries) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&hl=${lang === 'bn' ? 'bn' : 'en-BD'}&gl=BD&ceid=BD:${lang}`
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; isbdbannedhere watcher)' }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
    if (res?.ok) stories.push(...parseRss(await res.text()))
  }
  const known = new Set(items.flatMap((i) => i.events.flatMap((e) => e.sources.map((s) => fold(s.title ?? '')))).filter(Boolean))
  const list = candidates(stories, known).slice(0, 60)
  const picks = list.length ? (await classify(env.SUBQ_API_KEY, list)).slice(0, MAX_PER_RUN) : []
  let queued = 0
  for (const { story: s, verdict } of picks) {
    const url = normalizeUrl(s.url)
    if (!url) continue
    // Snap answers, it doesn't write: the headline stands in as the claim for the review.
    const r = await env.DB.prepare("INSERT OR IGNORE INTO receipts (url, origin, title, publisher, published, claim, claimed_status) VALUES (?1, 'watcher', ?2, ?3, ?4, ?2, ?5)")
      .bind(url, s.title, s.publisher || null, s.published ?? null, verdict)
      .run()
    queued += r.meta.changes
  }
  const summary = { fetched: stories.length, candidates: list.length, picked: picks.length, queued }
  console.log('[watcher]', JSON.stringify(summary))
  return summary
}
