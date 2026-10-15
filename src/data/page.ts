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

/**
 * Starts the review of a queued receipt right away: a POST to the T3 webhook (secret REVIEW_HOOK) launches the run
 * that reads the article, edits the data, merges and deploys. Without the secret, the daily sweep picks it up.
 */
export async function startReview(hook: string | undefined, id: number) {
  if (!hook) return
  await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }), signal: AbortSignal.timeout(8000) }).catch((e) => console.warn('[receipts] review hook failed', id, e))
}
