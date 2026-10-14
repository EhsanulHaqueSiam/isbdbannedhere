import qrcode from 'qrcode-generator'
import type { Status } from '../data/derive.ts'
import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { dict, fmtDate, headline, placeName, prep, statusLabel, type Lang } from '../lib/i18n.ts'
import { fitSize, num, scopeIn, whoIn } from '../lib/captions.ts'
import { useLang } from '../lib/lang.ts'
import { SITE } from '../lib/site.ts'
import { ART, BD_AT, frame, type Art } from '../lib/map.ts'
import type { CardMap } from '../data/api.ts'
import { Flag, Mark } from './ui.tsx'

export type Format = 'story' | 'post' | 'og'
export const formatSize: Record<Format, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, og: { w: 1200, h: 630 } }

// Dev has no VITE_SITE_URL, and cards are screenshotted from dev (pnpm cards), so QR codes fall back to the public origin.
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

/** Share card for an entry. `map` is the picture for entries without a photo (getMap); until it loads the space stays plain. */
export function ShareCard({ item, format, anim, lang = 'en', map }: { item: Item; format: Format; anim?: boolean; lang?: Lang; map?: CardMap | null }) {
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

  // Story and post: a picture (the place's photo, else the map), the flags (over it on stories, under it on posts),
  // then who, the verdict and whom.
  const story = format === 'story'
  const pad = story ? 80 : 70
  const inner = w - pad * 2
  const px = story ? 46 : 42
  const art = ART[format]
  const flags = <FlagRow item={item} h={story ? 120 : 84} status={status} />
  const name = lang === 'bn' ? (item.nameBn ?? item.name) : item.name
  const who = whoIn(item.category, lang)
  const scope = `${scopeIn(item, lang)} →`
  const bg = status === 'reopened' ? '#0a7d3b' : '#e3141c'
  // Bangla sets taller (line height 1.15 against Anton's 0.86), so its headline runs smaller to fit the same space.
  const bn = lang === 'bn'
  return (
    <div className={`${cardClass(status)}${anim ? ' anim' : ''}`} lang={lang} style={{ width: w, height: h, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', color: '#fff' }}>
      <div style={{ position: 'relative', height: art.h, flex: 'none' }}>
        {item.photo ? (
          <div className="duo" style={{ height: art.h }}>
            <img src={item.photo.src} alt="" />
            <span className="credit" style={{ fontSize: 22, padding: '6px 10px', right: 24, top: 24 }}>{item.photo.credit}</span>
          </div>
        ) : (
          map && <MapArt map={map} art={art} lang={lang} bg={bg} status={status} />
        )}
        {story && <div className="stamp-in" style={{ position: 'absolute', left: pad, bottom: 30 }}>{flags}</div>}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: `${story ? 44 : 30}px ${pad}px ${pad}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {!story && <div className="stamp-in" style={{ marginBottom: 22 }}>{flags}</div>}
          <p className="an" style={{ fontSize: fitSize(name, inner, story ? 110 : 84, { lines: 2, min: 56 }), lineHeight: bn ? 1.15 : 0.92 }}>{name}</p>
          {item.city && <p style={{ ...mono(px * 0.66), marginTop: 12 }}>{item.city}</p>}
          <p className="an stamp-in" style={{ fontSize: fitSize(head, inner, (story ? 220 : 160) * (bn ? 0.75 : 1), { min: 90 }), lineHeight: bn ? 1.15 : 0.86, marginTop: story ? 30 : 20 }}>{head}</p>
          <div className="fade-in" style={{ marginTop: story ? 22 : 16 }}><Slab text={who} px={story ? 96 : 72} width={inner} /></div>
          {status !== 'none' && <p className="mk fade-in" style={{ fontSize: fitSize(scope, inner, story ? 52 : 44, { lines: 2, face: 'marker', min: 30 }), color: '#fff', margin: `${story ? 30 : 22}px 0 0`, transform: 'rotate(-2deg)' }}>{scope}</p>}
        </div>
        <Signoff px={px} url={url} above={sourceLine(px * 0.62)} />
      </div>
    </div>
  )
}

/** Bangladesh's flag, the status icon, then the place's flag (or a company's logo): who did what to whom, before any reading. */
function FlagRow({ item, h, status }: { item: Item; h: number; status: Status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: h * 0.18 }}>
      <Flag code="BD" height={h} />
      {status !== 'none' && <svg viewBox="0 0 24 24" width={h * 0.9} height={h * 0.9} aria-hidden="true" style={{ color: '#fff', flex: 'none' }}>{glyphs[status]}</svg>}
      {item.country ? <Flag code={item.country} height={h} /> : <Mark domain={item.domain} size={h} title={item.name} />}
    </div>
  )
}

/** "Bangladeshi students" on white slabs: one slab when it fits a line, else one per word, stacked. */
function Slab({ text, px, width }: { text: string; px: number; width: number }) {
  const size = fitSize(text, width, px, { lines: 2, min: 48 })
  const words = fitSize(text, width, size) >= size ? [text] : text.split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${size * 0.12}px ${size * 0.2}px` }}>
      {words.map((t) => <span key={t} className="an slab" style={{ fontSize: size }}>{t}</span>)}
    </div>
  )
}

/**
 * The picture for entries without a photo: nearby land faint, the place white, Bangladesh in its flag's green and red,
 * the route between them marked with the status icon. Global companies get Bangladesh alone with the icon.
 */
function MapArt({ map, art, lang, bg, status }: { map: CardMap; art: Art; lang: Lang; bg: string; status: Status }) {
  const w = 1080
  const box = frame(map.at ? [BD_AT, map.at] : [BD_AT], art)
  const k = box[2] / w // map units per card pixel
  const [bx, by] = BD_AT
  const sign = (x: number, y: number, r: number) =>
    status !== 'none' && (
      <g transform={`translate(${x - r} ${y - r}) scale(${(2 * r) / 24})`} style={{ color: '#fff' }}>
        <circle cx="12" cy="12" r="10.8" fill={bg} />
        {glyphs[status]}
      </g>
    )
  // Over or under its place, away from the route (frame() leaves room); leaning toward the middle to stay in the crop.
  const label = ([x, y]: [number, number], text: string, over: boolean) => {
    const end = x > box[0] + box[2] / 2
    return <text x={x + (end ? 30 : -30) * k} y={y + (over ? -95 : 130) * k} textAnchor={end ? 'end' : 'start'} fontSize={58 * k} fontFamily="Anton, 'Noto Sans Bengali', Impact, sans-serif" fill="#fff" stroke={bg} strokeWidth={12 * k} paintOrder="stroke">{text.toUpperCase()}</text>
  }
  return (
    <svg viewBox={box.join(' ')} width={w} height={art.h} aria-hidden="true" style={{ display: 'block' }}>
      <path d={map.land} fill="#fff" fillOpacity={0.2} />
      {map.place ? <path d={map.place} fill="#fff" /> : map.at && <circle cx={map.at[0]} cy={map.at[1]} r={14 * k} fill="#fff" />}
      <path d={map.bd} fill="#2d6e41" stroke="#fff" strokeWidth={2 * k} />
      <circle cx={bx - 3 * k} cy={by} r={8 * k} fill="#f40b32" />
      <circle cx={bx} cy={by} r={70 * k} fill="none" stroke="#fff" strokeWidth={6 * k} />
      {map.at ? (
        <>
          <path d={`M${bx} ${by}L${map.at[0]} ${map.at[1]}`} stroke="#fff" strokeWidth={7 * k} strokeDasharray={`${22 * k} ${16 * k}`} fill="none" />
          {sign((bx + map.at[0]) / 2, (by + map.at[1]) / 2, 70 * k)}
        </>
      ) : (
        sign(bx + 130 * k, by - 130 * k, 80 * k)
      )}
      {label(BD_AT, lang === 'bn' ? 'বাংলাদেশ' : 'Bangladesh', !!map.at && map.at[1] > by)}
      {map.at && map.name && label(map.at, map.name[lang], map.at[1] < by)}
    </svg>
  )
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
