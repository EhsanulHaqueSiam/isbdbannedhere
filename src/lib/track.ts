// Tiny PostHog capture, no SDK, plus the ad pixels in lib/pixels.ts. PostHog is a no-op until VITE_POSTHOG_KEY (a public
// project key) is set. Events are listed in README.
// Every event carries the page, language, theme and, for visits from a shared card, which card and channel sent them.
import { pixelEvent } from './pixels.ts'

const KEY = import.meta.env?.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env?.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

function visitor() {
  let id = localStorage.getItem('isbd:id')
  if (!id) localStorage.setItem('isbd:id', (id = crypto.randomUUID()))
  return id
}

/** Page type from the path: home, category, entry, hub, tool, about, list. */
export function pageType(path: string): string {
  const p = path.replace(/^\/bn(?=\/|$)/, '') || '/'
  if (p === '/') return 'home'
  const [a, b] = p.slice(1).split('/')
  if (a === 'in') return 'hub'
  if (['check', 'compare', 'frame', 'week', 'share'].includes(a ?? '')) return 'tool'
  if (a === 'about' || a === 'list') return a
  return b ? 'entry' : 'category'
}

// Where this visit came from (shared card ?s=&f=, utm_*), kept for the whole visit.
const origin = (() => {
  if (typeof window === 'undefined') return {}
  const q = new URLSearchParams(location.search)
  const keys = ['s', 'f', 'utm_source', 'utm_medium', 'utm_campaign']
  const found = Object.fromEntries(keys.filter((k) => q.get(k)).map((k) => [k === 's' ? 'share_card' : k === 'f' ? 'share_channel' : k, q.get(k)]))
  return found
})()

export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  // Ad pixels (after consent), mapped to their standard events; entry page views also count as ViewContent.
  pixelEvent(event, props)
  if (event === '$pageview' && pageType(location.pathname) === 'entry') pixelEvent('view_entry', { content_name: document.title, content_category: location.pathname.split('/').filter(Boolean).at(-2) })
  if (!KEY) return
  const properties = {
    ...origin,
    ...props,
    $current_url: location.href,
    $pathname: location.pathname,
    $referrer: document.referrer,
    lang: location.pathname === '/bn' || location.pathname.startsWith('/bn/') ? 'bn' : 'en',
    theme: document.documentElement.dataset.theme === 'night' ? 'night' : 'red',
    page_type: pageType(location.pathname),
  }
  const body = JSON.stringify({ api_key: KEY, event, distinct_id: visitor(), properties })
  if (!navigator.sendBeacon?.(`${HOST}/i/v0/e/`, body)) void fetch(`${HOST}/i/v0/e/`, { method: 'POST', body, keepalive: true })
}
