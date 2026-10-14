import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { channelUrl, tracked, type Channel } from '../lib/share.ts'
import { shareText, toolCaption, type Mode } from '../lib/captions.ts'
import type { Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'
import { formatSize, type Format } from './Card.tsx'

// Pieces every share surface uses: the channel grid, the caption box, the "Copied" toast, image capture and saving.
// ShareSheet (entries), QuickShare (the entry page's share bar) and ToolShare (tool pages) are built from these.

// ---- icons: every share button pairs one of these with a text label ----

const paths = {
  whatsapp: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c.3 2 2.5 4.3 5 5" /></>,
  messenger: <><path d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.8 0 2.4 1.2 4.6 3 6V21l3-1.6c.8.2 1.6.3 2.5.3 4.7 0 8.5-3.4 8.5-7.8S16.7 3.5 12 3.5z" /><path d="M7.5 13.5l3-3 2.5 2 3.5-3.5" /></>,
  facebook: <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a20 20 0 0 0-2.4-.1c-2.4 0-3.9 1.4-3.9 4v2.2H8.6v3h2.7V21" />,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" /></>,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  telegram: <path d="M21 4L3 11l6 2.2M21 4l-3 16-7.5-6.2M21 4L9 13.2v5.3l2.8-3.3" />,
  copy: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />,
  share: <path d="M12 15V4m-4 4l4-4 4 4M6 11v8.5h12V11" />,
  photo: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8 8" /></>,
  warn: <><path d="M12 3.5L21.5 20h-19z" /><path d="M12 9.5v4.5" /><circle cx="12" cy="17" r=".6" /></>,
  doc: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></>,
}
export type IconName = keyof typeof paths

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>{paths[name]}</svg>
}

// ---- toast ----

/** A short "Copied" note at the bottom of the screen, announced to screen readers. Render `toast` once per surface. */
export function useToast() {
  const [note, setNote] = useState<{ text: string; n: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const say = (text: string) => {
    setNote((p) => ({ text, n: (p?.n ?? 0) + 1 }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNote(null), 2400)
  }
  const toast = (
    <div className="toast" role="status" aria-live="polite">
      {note && <span key={note.n}>{note.text}</span>}
    </div>
  )
  return { toast, say }
}

// ---- files ----

export function saveBlob(blob: Blob, name: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Renders a full-size card node into a PNG on the phone. */
export async function nodeBlob(node: HTMLElement | null, format: Format) {
  if (!node) return null
  await document.fonts.ready
  const { w, h } = formatSize[format]
  const opts = { width: w, height: h, pixelRatio: 1, style: { transform: 'none' } }
  // iOS Safari paints an image into the export only once it has decoded it, so the card's photo comes out blank on
  // the first pass. A throwaway pass decodes it.
  await toBlob(node, opts)
  return toBlob(node, opts)
}

/** Hands a file to the phone's share sheet; saves it where there is none. Returns what happened, or null if cancelled. */
export async function shareOrSave(file: File, text?: string): Promise<'native' | 'download' | null> {
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], text }).then(() => 'native' as const, () => null)
  saveBlob(file, file.name)
  return 'download'
}

/** True once mounted on a device whose share sheet takes files (phones, Safari). False during prerender. */
export function useCanShareFiles() {
  const [ok, setOk] = useState(false)
  useEffect(() => setOk(!!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] })), [])
  return ok
}

const open = (href: string) => {
  // App schemes (fb-messenger://) must replace the page; web intents open a new tab.
  if (href.startsWith('http')) window.open(href, '_blank', 'noopener')
  else location.href = href
}

// ---- channel grid ----

const grid = ['whatsapp', 'messenger', 'facebook', 'instagram', 'x', 'telegram', 'copy'] as const satisfies Channel[]
const iconFor: Record<Channel, IconName> = { whatsapp: 'whatsapp', messenger: 'messenger', facebook: 'facebook', instagram: 'instagram', x: 'x', telegram: 'telegram', copy: 'copy' }

type Send = {
  lang: Lang
  /** The caption, without the link (each channel adds its own tracked link). */
  text: string
  url: string
  /** Attribution id for ?s= and analytics: "tourism-uae", "check". */
  card: string
  format: string
  say: (m: string) => void
}

/** Sends to one channel. Shared by the grid and the entry page's share bar. */
export function useSend({ lang, text, url, card, format, say }: Send) {
  const s = shareText[lang]
  return async (ch: Channel, opts: { group?: string; media?: () => Promise<File | null> } = {}) => {
    const link = tracked(url, card, ch)
    const done = (channel: string) => track('share_done', { channel, format, card })
    if (ch === 'copy') {
      await navigator.clipboard.writeText(link).catch(() => {})
      say(s.linkCopied)
      track('link_copy', { card })
      return done(ch)
    }
    if (ch === 'instagram') {
      // Instagram has no share link: hand over the image and copy the link for the sticker.
      void navigator.clipboard?.writeText(link).catch(() => {})
      say(s.igHint)
      const file = await opts.media?.()
      if (file && (await shareOrSave(file))) done(ch)
      return
    }
    if (ch === 'facebook' && opts.group !== undefined) {
      // Facebook ignores prefilled text, so the group post goes on the clipboard first.
      void navigator.clipboard?.writeText(opts.group.includes(url) ? opts.group : `${opts.group}\n${link}`).catch(() => {})
      say(s.groupCopied)
    }
    const href = channelUrl(ch, text, link)
    if (href) open(href)
    done(ch)
  }
}

/** Every channel, one tap each, plus the phone's own share sheet ("More"), or Download where there is none. */
export function Channels({ lang, send, media, more: moreMedia = media, group, card, format, nativeText }: {
  lang: Lang
  send: ReturnType<typeof useSend>
  /** The story image (or video) for Instagram. */
  media: () => Promise<File | null>
  /** What "More" and Download hand over, when it differs from `media`. */
  more?: () => Promise<File | null>
  group?: string
  card: string
  format: string
  nativeText: string
}) {
  const s = shareText[lang]
  const native = useCanShareFiles()
  async function more() {
    const f = await moreMedia()
    const r = f && (await shareOrSave(f, nativeText))
    if (r) track('share_done', { channel: r, format, card })
  }
  return (
    <div className="chans">
      {grid.map((ch) => (
        <button key={ch} type="button" className={`chb ch-${ch}`} onClick={() => void send(ch, { group, media })}>
          <Icon name={iconFor[ch]} />
          <span>{s.channels[ch]}</span>
        </button>
      ))}
      <button type="button" className="chb ch-more" onClick={() => void more()}>
        <Icon name={native ? 'share' : 'download'} />
        <span>{native ? s.more : s.download}</span>
      </button>
    </div>
  )
}

// ---- caption ----

/** Caption you can edit before sending, with the Bangla-first / English switch and a copy button. */
export function CaptionBox({ lang, mode, setMode, value, onChange, onCopy }: { lang: Lang; mode: Mode; setMode: (m: Mode) => void; value: string; onChange: (v: string) => void; onCopy: () => void }) {
  const s = shareText[lang]
  return (
    <div style={{ marginTop: 14 }}>
      <div className="row" style={{ border: 0, padding: 0 }}>
        <label className="lab" htmlFor="caption">{s.caption}</label>
        <div className="seg" role="group" aria-label={s.captionLang}>
          <button type="button" lang="bn" aria-pressed={mode === 'bn'} onClick={() => setMode('bn')}>বাংলা</button>
          <button type="button" aria-pressed={mode === 'en'} onClick={() => setMode('en')}>EN</button>
        </div>
      </div>
      <textarea id="caption" className="input cap" rows={7} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="btn out" style={{ marginTop: 8 }} onClick={onCopy}><Icon name="doc" />{s.copyCaption}</button>
    </div>
  )
}

/** Caption state: generated from inputs until the reader edits it; changing an input regenerates it. */
export function useCaption(generate: (mode: Mode) => string, deps: unknown[]) {
  const [mode, setMode] = useState<Mode>('bn')
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => setDraft(null), [mode, ...deps])
  return { mode, setMode, value: draft ?? generate(mode), setValue: setDraft }
}

// ---- tool pages ----

/**
 * Share block for a tool card: one big "Share this card" button (the phone's share sheet with the image, or a
 * download), the channel grid, and an editable caption. `card` is the full-size card; it's previewed scaled down
 * and captured at full size.
 */
export function ToolShare({ lang, card, file, text, url, id, width = 320 }: { lang: Lang; card: React.ReactNode; file: string; text: { bn: string; en: string }; url: string; id: string; width?: number }) {
  const s = shareText[lang]
  const node = useRef<HTMLDivElement>(null)
  const { toast, say } = useToast()
  const cap = useCaption((m) => toolCaption(text, m), [text.bn, text.en])
  const send = useSend({ lang, text: cap.value, url, card: id, format: 'post', say })
  const media = async () => {
    const b = await nodeBlob(node.current, 'post')
    return b && new File([b], file, { type: 'image/png' })
  }
  async function primary() {
    const f = await media()
    const r = f && (await shareOrSave(f, `${cap.value}\n${tracked(url, id, 'copy')}`))
    if (r) track('share_done', { channel: r, format: 'post', card: id })
  }
  async function copy() {
    await navigator.clipboard.writeText(`${cap.value}\n${tracked(url, id, 'copy')}`).catch(() => {})
    say(s.copied)
    track('caption_copy', { card: id })
  }
  const { w, h } = formatSize.post
  const k = width / w
  return (
    <div className="tool-share">
      <div className="card-in" style={{ width, margin: '0 auto' }}>
        <div style={{ width, height: h * k, overflow: 'hidden', borderRadius: 8 }}>
          <div style={{ width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0' }}>
            <div ref={node}>{card}</div>
          </div>
        </div>
        <button type="button" className="btn big" style={{ marginTop: 0, borderRadius: '0 0 8px 8px' }} onClick={() => void primary()}>
          <Icon name="share" size={22} />{s.shareCard}
        </button>
      </div>
      <div className="pn tool-panel">
        <p className="lab">{s.sendTo}</p>
        <Channels lang={lang} send={send} media={media} card={id} format="post" nativeText={`${cap.value}\n${tracked(url, id, 'copy')}`} />
        <CaptionBox lang={lang} mode={cap.mode} setMode={cap.setMode} value={cap.value} onChange={cap.setValue} onCopy={() => void copy()} />
      </div>
      {toast}
    </div>
  )
}
