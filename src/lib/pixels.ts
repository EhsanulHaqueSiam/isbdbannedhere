// Social ad pixels: Meta, TikTok, X, LinkedIn, Snapchat, Pinterest, Google (GA4/Ads). Each loads only when its ID is
// set (VITE_*_ID in .env.production, all public) and only after the visitor allows it in the consent bar. track() in
// lib/track.ts forwards our events here, mapped to each platform's standard events so they can build audiences.

const env = import.meta.env ?? {}
const ids = {
  meta: env.VITE_META_PIXEL_ID as string | undefined,
  tiktok: env.VITE_TIKTOK_PIXEL_ID as string | undefined,
  x: env.VITE_X_PIXEL_ID as string | undefined,
  linkedin: env.VITE_LINKEDIN_PARTNER_ID as string | undefined,
  snap: env.VITE_SNAP_PIXEL_ID as string | undefined,
  pinterest: env.VITE_PINTEREST_TAG_ID as string | undefined,
  google: env.VITE_GA4_ID as string | undefined,
}
export const hasPixels = Object.values(ids).some(Boolean)

type Fn = (...args: unknown[]) => void
type Queued = Fn & { queue: unknown[]; [k: string]: unknown }
const w = (typeof window === 'undefined' ? {} : window) as unknown as Record<string, Queued | unknown[] | undefined>
const call = (name: string, ...args: unknown[]) => (w[name] as Fn | undefined)?.(...args)

function script(src: string) {
  const s = Object.assign(document.createElement('script'), { async: true, src })
  document.head.append(s)
}
/** A queue stub the vendor script drains when it loads, like each vendor's own snippet. */
function stub(name: string, drain = 'callMethod') {
  if (w[name]) return
  const f = ((...args: unknown[]) => {
    const handler = f[drain] as Fn | undefined
    handler ? handler(...args) : f.queue.push(args)
  }) as Queued
  f.queue = []
  w[name] = f
}

let loaded = false
/** Loads every configured pixel once. Called after consent. */
export function loadPixels() {
  if (loaded || !hasPixels || typeof window === 'undefined') return
  loaded = true
  if (ids.meta) {
    stub('fbq')
    Object.assign(w.fbq as Queued, { push: w.fbq, loaded: true, version: '2.0' })
    w._fbq = w.fbq
    script('https://connect.facebook.net/en_US/fbevents.js')
    call('fbq', 'init', ids.meta)
  }
  if (ids.tiktok) {
    // TikTok's loader reads ttq as an array of [method, ...args] calls.
    const ttq = (w.ttq = (w.ttq as unknown[] | undefined) ?? []) as unknown[] & Record<string, unknown>
    for (const m of ['page', 'track', 'identify']) ttq[m] = (...a: unknown[]) => ttq.push([m, ...a])
    Object.assign(window, { TiktokAnalyticsObject: 'ttq' })
    Object.assign(ttq, { _i: { [ids.tiktok]: Object.assign([], { _u: 'https://analytics.tiktok.com/i18n/pixel/events.js' }) }, _t: { [ids.tiktok]: Date.now() }, _o: { [ids.tiktok]: {} } })
    script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${ids.tiktok}&lib=ttq`)
  }
  if (ids.x) {
    stub('twq', 'exe')
    script('https://static.ads-twitter.com/uwt.js')
    call('twq', 'config', ids.x)
  }
  if (ids.linkedin) {
    Object.assign(window, { _linkedin_partner_id: ids.linkedin, _linkedin_data_partner_ids: [ids.linkedin] })
    script('https://snap.licdn.com/li.lms-analytics/insight.min.js')
  }
  if (ids.snap) {
    stub('snaptr', 'handleRequest')
    script('https://sc-static.net/scevent.min.js')
    call('snaptr', 'init', ids.snap)
  }
  if (ids.pinterest) {
    stub('pintrk')
    Object.assign(w.pintrk as Queued, { version: '3.0' })
    script('https://s.pinimg.com/ct/core.js')
    call('pintrk', 'load', ids.pinterest)
  }
  if (ids.google) {
    const dl = (w.dataLayer = (w.dataLayer as unknown[] | undefined) ?? []) as unknown[]
    w.gtag = function gtag() {
      // gtag queues the arguments object itself.
      // eslint-disable-next-line prefer-rest-params
      dl.push(arguments)
    } as unknown as Queued
    script(`https://www.googletagmanager.com/gtag/js?id=${ids.google}`)
    call('gtag', 'js', new Date())
    call('gtag', 'config', ids.google, { send_page_view: false })
  }
}

// Our events -> each platform's standard event names. Unmapped events go to Meta and Google as custom events.
const standard: Record<string, { meta: string; tiktok: string; snap: string; pinterest: string; google: string }> = {
  view_entry: { meta: 'ViewContent', tiktok: 'ViewContent', snap: 'VIEW_CONTENT', pinterest: 'pagevisit', google: 'view_item' },
  search: { meta: 'Search', tiktok: 'Search', snap: 'SEARCH', pinterest: 'search', google: 'search' },
  shortlist_add: { meta: 'AddToWishlist', tiktok: 'AddToWishlist', snap: 'ADD_TO_WISHLIST', pinterest: 'addtocart', google: 'add_to_wishlist' },
  receipt_send: { meta: 'Lead', tiktok: 'SubmitForm', snap: 'SIGN_UP', pinterest: 'lead', google: 'generate_lead' },
  share_done: { meta: 'Share', tiktok: 'ClickButton', snap: 'SHARE', pinterest: 'custom', google: 'share' },
}
const metaStandard = new Set(['ViewContent', 'Search', 'AddToWishlist', 'Lead'])

/** Sends one of our events (or '$pageview') to every loaded pixel. */
export function pixelEvent(event: string, props: Record<string, unknown> = {}) {
  if (!loaded) return
  if (event === '$pageview') {
    call('fbq', 'track', 'PageView')
    ;(w.ttq as Record<string, Fn> | undefined)?.page?.()
    call('snaptr', 'track', 'PAGE_VIEW')
    call('pintrk', 'page')
    call('gtag', 'event', 'page_view', { page_location: location.href })
    return
  }
  const s = standard[event]
  call('fbq', s && metaStandard.has(s.meta) ? 'track' : 'trackCustom', s?.meta ?? event, props)
  if (s) {
    ;(w.ttq as Record<string, Fn> | undefined)?.track?.(s.tiktok, props)
    call('snaptr', 'track', s.snap, props)
    call('pintrk', 'track', s.pinterest, props)
  }
  call('gtag', 'event', s?.google ?? event, props)
}

const KEY = 'isbd:consent'
export const consent = () => (typeof localStorage === 'undefined' ? null : (localStorage.getItem(KEY) as 'yes' | 'no' | null))
export function setConsent(v: 'yes' | 'no') {
  localStorage.setItem(KEY, v)
  if (v === 'yes') loadPixels()
}
