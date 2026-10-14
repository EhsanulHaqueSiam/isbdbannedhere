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

// Hosts that are almost never a receipt: a video, a social post, a shortened link or a search page. The form warns
// before Send (gate 1); the reader can still send.
const unlikelyHosts: [RegExp, 'video' | 'social' | 'short' | 'search'][] = [
  [/(^|\.)(youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|dailymotion\.com)$/, 'video'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.watch|instagram\.com|x\.com|twitter\.com|threads\.net|linkedin\.com|reddit\.com|t\.me|whatsapp\.com)$/, 'social'],
  [/(^|\.)(bit\.ly|t\.co|tinyurl\.com|goo\.gl|cutt\.ly|rb\.gy|shorturl\.at|is\.gd|ow\.ly)$/, 'short'],
  [/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$/, 'search'],
]

/** Why a pasted link is unlikely to be a receipt, or null when it looks fine (or isn't a link yet). */
export function looksUnlikely(raw: string): 'video' | 'social' | 'short' | 'search' | null {
  const url = normalizeUrl(raw)
  if (!url) return null
  const host = new URL(url).hostname
  if (/google\.[a-z.]+$/.test(host) && !/^\/(search|url)/.test(new URL(url).pathname) && !/[?&]q=/.test(url)) return null
  return unlikelyHosts.find(([re]) => re.test(host))?.[1] ?? null
}
