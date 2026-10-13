// Tiny PostHog capture. No-op until VITE_POSTHOG_KEY is set. Events are listed in README.
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

function visitor() {
  let id = localStorage.getItem('isbd:id')
  if (!id) localStorage.setItem('isbd:id', (id = crypto.randomUUID()))
  return id
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (!KEY || typeof window === 'undefined') return
  const body = JSON.stringify({ api_key: KEY, event, distinct_id: visitor(), properties: { ...props, $current_url: location.href, $referrer: document.referrer } })
  if (!navigator.sendBeacon?.(`${HOST}/i/v0/e/`, body)) void fetch(`${HOST}/i/v0/e/`, { method: 'POST', body, keepalive: true })
}
