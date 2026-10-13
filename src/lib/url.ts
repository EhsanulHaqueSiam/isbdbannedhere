const tracking = /^(utm_|fbclid$|gclid$|igshid$|mc_cid$|mc_eid$|ref_src$)/

/**
 * One form per article, so the same link sent twice is one receipt: https, no www/m/amp host, no tracking params,
 * no fragment, no trailing slash. A missing scheme is fine ("thedailystar.net/..."). Null if it isn't a public web link.
 */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim()
  let u: URL
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/^(www|m|amp|mobile)\./, '')
  // No IP literals or local names: a receipt is a public page someone else can open.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || /^[\d.]+$/.test(host)) return null
  for (const k of [...u.searchParams.keys()]) if (tracking.test(k)) u.searchParams.delete(k)
  const path = u.pathname.replace(/\/amp\/?$/, '').replace(/\/+$/, '')
  return `https://${host}${path}${u.search}`
}
