// One place that builds every channel's share link, so the share sheet, country pages and tool pages all send the same
// thing. Text is Bangla first with English below; links carry ?s=<card>&f=<channel> so a visit traces back (README).

export type Channel = 'whatsapp' | 'messenger' | 'facebook' | 'instagram' | 'x' | 'telegram' | 'copy'

/** Adds the attribution params the analytics read (`share_visit`). */
export const tracked = (url: string, card: string, channel: Channel) => `${url}${url.includes('?') ? '&' : '?'}s=${encodeURIComponent(card)}&f=${channel}`

/** Share URL for a channel. `instagram` and `copy` have none: the sheet saves the card or copies the text instead. */
export function channelUrl(channel: Channel, text: string, url: string): string | null {
  const t = encodeURIComponent(text), u = encodeURIComponent(url)
  switch (channel) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
    case 'messenger':
      // Opens the Messenger app on phones; desktop browsers fall back to the Facebook share dialog.
      return /Android|iPhone|iPad/i.test(globalThis.navigator?.userAgent ?? '') ? `fb-messenger://share/?link=${u}` : `https://www.facebook.com/sharer/sharer.php?u=${u}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`
    case 'x':
      return `https://x.com/intent/post?text=${t}&url=${u}`
    case 'telegram':
      return `https://t.me/share/url?url=${u}&text=${t}`
    default:
      return null
  }
}

/** "@a @b" from handle lists, deduplicated, for the caption and the X intent. */
export const mentions = (handles: (string | undefined)[]) => [...new Set(handles.filter(Boolean).map((h) => `@${h}`))].join(' ')
