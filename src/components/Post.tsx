import type { Status } from '../data/derive.ts'
import type { Source } from '../data/schema.ts'
import { fmtDate, type Lang } from '../lib/i18n.ts'
import logoList from '../data/logos.json'
import { StatusIcon } from './ui.tsx'

// Every link on the site is a post: the publisher's icon, name, date and tier, the headline, the article's own
// picture when we have one (src/data/press.json, fetched on approval), what it claims, and where it opens.
// Used for sources on entries, the proof list, reader receipts and the public queue.

const logos = new Set<string>(logoList)
export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }

/** Publisher icon from public/logos (scripts/logos.ts), or the first letter. */
export function Favicon({ url, publisher }: { url: string; publisher: string }) {
  const h = hostOf(url)
  if (logos.has(h)) return <img className="fav" src={`/logos/${h}.png`} alt="" width={16} height={16} loading="lazy" />
  return <span className="fav" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', font: '800 10px/1 system-ui' }}>{publisher[0]}</span>
}

const tierWord = { en: { official: 'Official', press: 'Press', community: 'Community', reader: 'Reader', watcher: 'Watcher' }, bn: { official: 'অফিশিয়াল', press: 'সংবাদ', community: 'কমিউনিটি', reader: 'পাঠক', watcher: 'ওয়াচার' } }
export type Tier = keyof typeof tierWord.en

export function PostCard({ url, publisher, title, date, tier, image, claim, status, lang, compact, onPanel = true, tag, children }: {
  url: string
  publisher: string
  title?: string | null
  date?: string | null
  tier: Tier
  /** Article picture; shown above the text, credited to the publisher by the source line. */
  image?: string | null
  /** What the article says for Bangladeshis, with the status it implies. */
  claim?: string
  status?: Status
  lang: Lang
  compact?: boolean
  /** White panel (default) or the translucent card on the red page. */
  onPanel?: boolean
  /** Receipt number, shown after the tier. */
  tag?: string
  children?: React.ReactNode
}) {
  const h = hostOf(url)
  return (
    <article className={`post ${onPanel ? 'pn' : 'pr'}${compact ? ' compact' : ''} ${image && !compact ? 'img-top' : 'img-none'}`}>
      {image && !compact && <img className="og" src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />}
      <div className="post-b">
        <p className="lab src"><Favicon url={url} publisher={publisher} /> {publisher}{date ? ` · ${fmtDate(date, lang)}` : ''} <b className={`tier ${tier}`}>{tierWord[lang][tier]}</b>{tag && <span className="lab">{tag}</span>}</p>
        <a className="hl" href={url} target="_blank" rel="noopener noreferrer">{title || publisher}</a>
        {claim && <p className={`claim${!status || status === 'none' ? ' muted' : ''}`}>{status && <StatusIcon status={status} />}<span>{claim}</span></p>}
        {children}
        <a className="lab" href={url} target="_blank" rel="noopener noreferrer">{lang === 'bn' ? 'খুলুন' : 'Open'} ↗ · {h}</a>
      </div>
    </article>
  )
}

/** A data source as a post. */
export function SourcePost({ source, lang, compact, image, onPanel }: { source: Source; lang: Lang; compact?: boolean; image?: string | null; onPanel?: boolean }) {
  return <PostCard url={source.url} publisher={source.publisher} title={source.title} date={source.date} tier={source.tier} image={image} lang={lang} compact={compact} onPanel={onPanel} />
}
