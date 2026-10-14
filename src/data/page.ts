import { decode } from './watcher.ts'

// Reads a submitted link for the receipt gates (submit.ts). Server only.

export type Page = { title: string | null; publisher: string; published: string | null; text: string }

/** Reads the article: title, publisher, date and its text. Null when the page can't be read (then it is queued as is). */
export async function readPage(url: string, ms = 6000): Promise<Page | null> {
  const html = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; isbdbannedhere receipts)' }, redirect: 'follow', signal: AbortSignal.timeout(ms) })
    .then((res) => (res.ok && res.headers.get('content-type')?.includes('html') ? res.text() : ''))
    .then((t) => t.slice(0, 400_000))
    .catch(() => '')
  if (!html) return null
  const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, 'i'))?.[1]
  const raw = meta('og:title') ?? html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim()
  return {
    title: raw ? decode(raw) : null,
    publisher: decode(meta('og:site_name') ?? new URL(url).hostname.replace(/^www\./, '')),
    published: meta('article:published_time')?.slice(0, 10) ?? null,
    text: html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 40_000),
  }
}

/** Gate 2: a page that never says Bangladesh (either script) can't be a receipt about Bangladeshis. */
export const mentionsBangladesh = (p: Page) => /bangladesh|বাংলাদেশ/i.test(`${p.title ?? ''} ${p.text}`)
