import type { Status } from '../data/derive.ts'
import { statusLabel, type Lang } from '../lib/i18n.ts'
import logoList from '../data/logos.json'

const logos = new Set<string>(logoList)

/** Recognisable mark for an entity: its site icon when we have one, else its flag. */
export function Mark({ domain, country, size = 40, title }: { domain?: string; country?: string; size?: number; title?: string }) {
  if (domain && logos.has(domain))
    return <img src={`/logos/${domain}.png`} alt={title ?? ''} title={title} width={size} height={size} loading="lazy" style={{ width: size, height: size, borderRadius: 8, background: '#fff', padding: size * 0.12, boxSizing: 'border-box', boxShadow: '0 0 0 1px rgba(0,0,0,.12)', flex: 'none' }} />
  // Same-size tile so rows line up: the flag, or the name's first letter.
  return (
    <span title={title} style={{ width: size, height: size, borderRadius: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      {country ? <Flag code={country} className="fl" title={title} /> : <span className="an" style={{ fontSize: size * 0.5, color: '#0a0a0a' }}>{title?.[0] ?? '?'}</span>}
    </span>
  )
}

/** SVG symbols for every status icon. Rendered once in the root; icons reference them with <use>. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="i-shut" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><line x1="5.4" y1="5.4" x2="18.6" y2="18.6" stroke="currentColor" strokeWidth="3.2" /></symbol>
      <symbol id="i-unclear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="3.2 2.6" /><text x="12" y="16.6" textAnchor="middle" fontFamily="Anton,Impact,sans-serif" fontSize="13" fill="currentColor">?</text></symbol>
      <symbol id="i-restricted" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><line x1="12" y1="6.5" x2="12" y2="13.5" stroke="currentColor" strokeWidth="3.2" /><circle cx="12" cy="17.3" r="1.8" fill="currentColor" /></symbol>
      <symbol id="i-reopened" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><path d="M7.4 12.4l3.1 3.1 6.1-6.6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    </svg>
  )
}

const iconFor: Record<Status, string | null> = { shut: 'i-shut', disputed: 'i-unclear', unclear: 'i-unclear', restricted: 'i-restricted', reopened: 'i-reopened', none: null }
const toneFor: Record<Status, string> = { shut: 'ix', disputed: 'ix', unclear: 'ix', restricted: 'ir', reopened: 'io', none: 'c2' }

export function StatusIcon({ status, size }: { status: Status; size?: number }) {
  const id = iconFor[status]
  if (!id) return null
  return (
    <svg className={`ic ${toneFor[status]}`} style={size ? { fontSize: size } : undefined} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  )
}

/** Icon plus plain label. Status is never color alone. */
export function StatusTag({ status, lang, text }: { status: Status; lang: Lang; text?: string }) {
  return (
    <span className="st">
      <StatusIcon status={status} />
      {text ?? statusLabel[lang][status]}
    </span>
  )
}

const flagUrls = import.meta.glob<string>('/node_modules/country-flag-icons/3x2/*.svg', { eager: true, query: '?url', import: 'default' })

/** Country flag, 3:2. `height` in px for share cards; pages use the .fl size. */
export function Flag({ code, className = 'fl', title, height }: { code?: string; className?: string; title?: string; height?: number }) {
  const src = code ? flagUrls[`/node_modules/country-flag-icons/3x2/${code}.svg`] : undefined
  return src ? <img className={className} src={src} alt={title ?? ''} width={21} height={14} loading="lazy" style={height ? { height, flex: 'none' } : undefined} /> : null
}

export function MonthBlocks({ strip, from, to }: { strip: Status[]; from?: string; to?: string }) {
  return (
    <>
      <div className="mb" role="img" aria-label={`Monthly status: ${strip.join(', ')}`}>
        {strip.map((s, i) => <i key={i} className={s} style={{ '--i': i } as React.CSSProperties} />)}
      </div>
      {(from || to) && <div className="mx"><span>{from}</span><span>{to}</span></div>}
    </>
  )
}

/** 100 dots, the first `n` filled. Used for "refused per 100" style comparisons. */
export function Waffle({ n, tone }: { n: number; tone: 'x' | 'k' }) {
  return (
    <div role="img" aria-label={`${n} in every 100`} style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 2 }}>
      {Array.from({ length: 100 }, (_, i) => (
        <i key={i} style={{ aspectRatio: '1', borderRadius: '50%', display: 'block', background: i < n ? (tone === 'x' ? 'var(--cx)' : 'currentColor') : 'var(--cd)' }} />
      ))}
    </div>
  )
}

/** Header logo. White, not ink: black type under 24px is below 4.5:1 on red (DESIGN.md). */
export function Logo({ text, size = 18 }: { text: string; size?: number }) {
  return (
    <span className="an" style={{ fontSize: size, display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '0.02em', color: '#fff' }}>
      <svg className="ic" aria-hidden="true"><use href="#i-shut" /></svg>
      {text}
    </span>
  )
}
