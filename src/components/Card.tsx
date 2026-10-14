import qrcode from 'qrcode-generator'
import type { Status } from '../data/derive.ts'
import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { categoryLabel, dict, fmtDate, headline, placeName, prep, shortName, statusLabel, type Lang } from '../lib/i18n.ts'
import { fitSize, num, scopeIn, sentenceIn } from '../lib/captions.ts'
import { useLang } from '../lib/lang.ts'
import { SITE } from '../lib/site.ts'
import { Flag, Mark, MonthBlocks } from './ui.tsx'

export type Format = 'story' | 'post' | 'og'
export const formatSize: Record<Format, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, og: { w: 1200, h: 630 } }

// Dev has no VITE_SITE_URL, so QR codes fall back to the public origin.
export const ORIGIN = SITE || 'https://isbdbannedhere.ehsanulsiam.workers.dev'

export function topSource(item: Item) {
  const all = item.events.flatMap((e) => e.sources)
  return all.find((s) => s.tier === 'official') ?? all[0]
}

export const mono = (px: number): React.CSSProperties => ({ font: `700 ${px}px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace`, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', margin: 0 })
export const sans = (px: number, lh = 1.12): React.CSSProperties => ({ font: `800 ${px}px/${lh} system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif`, color: '#fff', margin: 0 })

/** QR code as crisp SVG on a white tile, for printouts at coaching centres and campuses. */
export function Qr({ url, size }: { url: string; size: number }) {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  const n = qr.getModuleCount()
  const q = 2 // quiet zone, in modules
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 2 * q} ${n + 2 * q}`} shapeRendering="crispEdges" role="img" aria-label={`QR code: ${url}`} style={{ display: 'block', flex: 'none', background: '#fff' }}>
      <path d={d} fill="#0a0a0a" />
    </svg>
  )
}

// Status icons drawn inline, not through the page's <use> sprite: cards rendered into images on the phone
// (html-to-image) can't see the sprite. Same shapes as ui.tsx's IconSprite.
const glyphs: Record<Exclude<Status, 'none'>, React.ReactNode> = {
  shut: <><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><line x1="5.4" y1="5.4" x2="18.6" y2="18.6" stroke="currentColor" strokeWidth="3.2" /></>,
  disputed: <><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="3.2 2.6" /><text x="12" y="16.6" textAnchor="middle" fontFamily="Anton,Impact,sans-serif" fontSize="13" fill="currentColor">?</text></>,
  unclear: <><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="3.2 2.6" /><text x="12" y="16.6" textAnchor="middle" fontFamily="Anton,Impact,sans-serif" fontSize="13" fill="currentColor">?</text></>,
  restricted: <><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><line x1="12" y1="6.5" x2="12" y2="13.5" stroke="currentColor" strokeWidth="3.2" /><circle cx="12" cy="17.3" r="1.8" fill="currentColor" /></>,
  reopened: <><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="3.2" /><path d="M7.4 12.4l3.1 3.1 6.1-6.6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></>,
}
const tone: Record<Status, string> = { shut: 'ix', disputed: 'ix', unclear: 'ix', restricted: 'ir', reopened: 'io', none: 'c2' }

export function CardIcon({ status, size }: { status: Status; size: number }) {
  if (status === 'none') return null
  return <svg className={`ic ${tone[status]}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ width: size, height: size }}>{glyphs[status]}</svg>
}

/** Site logo for cards: prohibition sign and the name, in white. */
export function CardLogo({ px }: { px: number }) {
  return (
    // weight 400: Bangla pages set .an to 800 for Bangla type, which would fake-bold Anton here
    <span className="an" style={{ fontSize: px, fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: px * 0.3, color: '#fff', whiteSpace: 'nowrap' }}>
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden="true">{glyphs.shut}</svg>Is BD banned here?
    </span>
  )
}

/** Logo and hashtag on the left, QR to `url` on the right. Every card ends with this. */
function Signoff({ px, url, above }: { px: number; url: string; above?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: px * 0.6 }}>
      <div style={{ display: 'grid', gap: px * 0.45, minWidth: 0 }}>
        {above}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: `${px * 0.2}px ${px * 0.6}px` }}>
          <CardLogo px={px} />
          <span style={mono(px * 0.62)}>#isBDbannedhere</span>
        </div>
      </div>
      <Qr url={url} size={Math.round(px * 3.4)} />
    </div>
  )
}

/** Share red, or green for good news (reopened). White type on both. */
const cardClass = (status: Status) => `rc${status === 'reopened' ? ' ok' : ''}`

/** Share card for an entry: story, post, or the link preview (og). */
export function ShareCard({ item, format, anim, lang = 'en' }: { item: Item; format: Format; anim?: boolean; lang?: Lang }) {
  const { w, h } = formatSize[format]
  const status = item.state.status
  const head = headline[lang][status]
  const src = topSource(item)
  const more = item.conf.sources - 1
  const sourceLine = (px: number) => (
    <p style={{ ...mono(px), textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
      {src ? (lang === 'bn' ? `সূত্র: ${src.publisher}${more > 0 ? ` + আরও ${num(more, 'bn')}টি` : ''} · ` : `Source: ${src.publisher}${more > 0 ? ` + ${more} more` : ''} · `) : ''}
      {lang === 'bn' ? `তারিখ ${fmtDate(TODAY, 'bn')}` : `As of ${fmtDate(TODAY)}`}
    </p>
  )
  const url = `${ORIGIN}${lang === 'bn' ? '/bn' : ''}${item.href}`

  if (format === 'og') {
    // Text column: card width minus padding, gap and the 340px icon.
    const col = w - 128 - 48 - 340
    const name = lang === 'bn' ? (item.nameBn ?? item.name) : placeName(item)
    const title = lang === 'bn' ? `${name}: বাংলাদেশ কি নিষিদ্ধ?` : `Is BD banned ${prep(item.category)} ${name}?`
    const sub = `${head} ${scopeIn(item, lang)}${lang === 'bn' ? '' : '.'}`
    return (
      <div className={cardClass(status)} lang={lang} style={{ width: w, height: h, padding: 64, display: 'flex', gap: 48, boxSizing: 'border-box', color: '#fff' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={mono(24)}><Flag code={item.country} className="fl" /> {item.domain ?? item.category}</p>
          <div>
            <p className="an" style={{ fontSize: fitSize(title, col, 92, { lines: 3, min: 44 }), lineHeight: 1 }}>{title}</p>
            <p style={{ ...sans(fitSize(sub, col, 40, { lines: 2, face: 'sans', min: 26 }), 1.2), marginTop: 18 }}>{sub}</p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {sourceLine(21)}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><CardLogo px={34} /><span style={mono(21)}>#isBDbannedhere</span></div>
          </div>
        </div>
        <div style={{ alignSelf: 'center' }}><CardIcon status={status} size={340} /></div>
      </div>
    )
  }

  // Story and post (A, picked 14 Oct 2026): the picture, the name, the headline word on a white slab in the page's
  // language with the other language under it, both sentences, the month strip, the footer.
  const story = format === 'story'
  const pad = 80
  const inner = w - pad * 2
  const artH = story ? 700 : 340
  const other: Lang = lang === 'bn' ? 'en' : 'bn'
  const name = lang === 'bn' ? (item.nameBn ?? item.name) : item.name
  const word2 = headline[other][status]
  const say1 = sentenceIn(item, lang)
  const say2 = sentenceIn(item, other)
  const scope = `${scopeIn(item, lang)} →`
  const where = [item.city, item.country ? countryLabel(item.country, lang) : lang === 'bn' ? 'বিশ্বজুড়ে' : 'Global', categoryLabel[lang][item.category]].filter(Boolean).join(' · ')
  const kicker = (
    <p style={{ ...mono(30), position: 'absolute', left: pad, bottom: 24, display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
      <Flag code="BD" height={40} /> {where}
    </p>
  )
  return (
    <div className={`${cardClass(status)}${anim ? ' anim' : ''}`} lang={lang} style={{ width: w, height: h, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', color: '#fff' }}>
      {item.photo ? (
        <div className="duo" style={{ height: artH, flex: 'none' }}>
          <img src={item.photo.src} alt="" />
          <span className="credit" style={{ fontSize: 22, padding: '8px 10px', right: 24, top: 24 }}>{item.photo.credit}</span>
          {kicker}
        </div>
      ) : (
        <div className="field" style={{ height: artH, flex: 'none' }}>
          {item.country ? <Flag code={item.country} /> : <span className="logo"><Mark domain={item.domain} size={240} title={item.name} /></span>}
          {kicker}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: `${story ? 30 : 24}px ${pad}px ${pad}px`, display: 'flex', flexDirection: 'column', gap: story ? 18 : 12 }}>
        <p className="an" style={{ fontSize: fitSize(name, inner, story ? 96 : 72, { lines: 2, min: 48 }), lineHeight: lang === 'bn' ? 1.15 : 0.92 }}>{name}</p>
        <p className="an stamp-in" style={{ fontSize: fitSize(head, inner, story ? 200 : 130, { min: 96 }), lineHeight: 0.9 }}><span className="slab">{head}</span></p>
        <p className="an" lang={other} style={{ fontSize: fitSize(word2, inner, story ? 96 : 64, { min: 44 }), lineHeight: other === 'bn' ? 1.15 : 0.92, opacity: 0.95 }}>{word2}</p>
        <p className="fade-in" style={{ ...sans(fitSize(`${say1} ${scope}`, inner, story ? 48 : 36, { lines: 3, face: 'sans', min: 28 }), 1.2) }}>
          {say1} {status !== 'none' && <span className="mk" style={{ fontSize: '1.05em' }}>{scope}</span>}
        </p>
        <p className="fade-in" lang={other} style={{ ...sans(fitSize(say2, inner, story ? 40 : 30, { lines: 3, face: 'sans', min: 24 }), 1.25), opacity: 0.95 }}>{say2}</p>
        <div className="card-strip"><MonthBlocks strip={item.strip} /></div>
        <div style={{ marginTop: 'auto' }}><Signoff px={story ? 46 : 42} url={url} above={sourceLine((story ? 46 : 42) * 0.62)} /></div>
      </div>
    </div>
  )
}

/** Country name for the kicker: the short name people use, else the locale's name. */
function countryLabel(code: string, lang: Lang) {
  return shortName[code] ?? new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code
}

/**
 * Frame for the tool cards (check, compare, week slides): post-size share red, or green for good news, the content,
 * then the logo and a QR to `url`. Content sizes its own text with fitSize().
 */
export function CardFrame({ url, lang, green, children }: { url: string; lang: Lang; green?: boolean; children: React.ReactNode }) {
  const { w, h } = formatSize.post
  return (
    <div className={green ? 'rc ok' : 'rc'} lang={lang} style={{ width: w, height: h, padding: 70, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40, color: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, minHeight: 0 }}>{children}</div>
      <Signoff px={42} url={url} />
    </div>
  )
}
/** Width of the content box inside CardFrame. */
export const FRAME_INNER = formatSize.post.w - 140

/** The personal "I checked my list" card. Rendered on the phone, never uploaded. */
export function ListCard({ list }: { list: Item[] }) {
  const lang = useLang()
  const t = dict[lang]
  const bad = list.filter((i) => ['shut', 'disputed', 'unclear', 'restricted'].includes(i.state.status))
  const label = (s: Status) => (lang === 'bn' ? statusLabel.bn[s] : s === 'none' ? 'no reports' : headline.en[s].replace('.', '').toLowerCase())
  return (
    <div className="rc" lang={lang} style={{ width: 1080, height: 1920, padding: 90, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#fff' }}>
      <p style={mono(32)}>{lang === 'bn' ? `${t.myList} · ${fmtDate(TODAY, 'bn')}` : `My list · as of ${fmtDate(TODAY)}`}</p>
      <div>
        <p className="an" style={{ fontSize: fitSize(t.myListTitle, 900, 210, { lines: 2, min: 120 }), lineHeight: lang === 'bn' ? 1.15 : 0.92 }}>{t.myListTitle}</p>
        <div style={{ marginTop: 60 }}>
          {list.slice(0, 7).map((i) => {
            const name = lang === 'bn' && i.nameBn ? i.nameBn : i.name
            return (
              <div key={i.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: '20px 0', borderBottom: '3px solid rgba(10,10,10,.3)' }}>
                <span className={i.state.status === 'shut' ? 'strike' : ''} style={{ ...sans(fitSize(name, 640, 64, { face: 'sans', min: 40 }), 1.05), maxWidth: 640 }}>{name}</span>
                <span className="mk" style={{ fontSize: 44, color: '#fff', whiteSpace: 'nowrap' }}>{label(i.state.status)}</span>
              </div>
            )
          })}
        </div>
        <p className="mk" style={{ fontSize: 76, color: '#fff', margin: '50px 0 0', transform: 'rotate(-2deg)' }}>{t.notSafe(bad.length, list.length)}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 30 }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <span className="an" style={{ fontSize: 64, lineHeight: 1 }}>{lang === 'bn' ? 'আপনারটাও দেখুন' : 'Check yours'}</span>
          <CardLogo px={40} />
        </div>
        <Qr url={`${ORIGIN}${lang === 'bn' ? '/bn' : ''}/list`} size={190} />
      </div>
    </div>
  )
}
