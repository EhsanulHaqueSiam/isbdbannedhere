import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { fmtDate, headline, placeName, prep, scope, sentence } from '../lib/i18n.ts'
import { Flag, MonthBlocks, StatusIcon } from './ui.tsx'

export type Format = 'story' | 'post' | 'og'
export const formatSize: Record<Format, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, og: { w: 1200, h: 630 } }

function topSource(item: Item) {
  const all = item.events.flatMap((e) => e.sources)
  return all.find((s) => s.tier === 'official') ?? all[0]
}

const mono = (px: number): React.CSSProperties => ({ font: `700 ${px}px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace`, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', margin: 0 })

function Footer({ item, px }: { item: Item; px: number }) {
  const src = topSource(item)
  return (
    <div style={{ display: 'grid', gap: px * 0.5 }}>
      <p style={{ ...mono(px * 0.62), textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
        {src ? `Source: ${src.publisher}${item.conf.sources > 1 ? ` + ${item.conf.sources - 1} more` : ''} · ` : ''}As of {fmtDate(TODAY)}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="an" style={{ fontSize: px, display: 'inline-flex', alignItems: 'center', gap: px * 0.3 }}>
          <svg className="ic" aria-hidden="true"><use href="#i-shut" /></svg>Is BD banned here?
        </span>
        <span style={mono(px * 0.62)}>#isBDbannedhere</span>
      </div>
    </div>
  )
}

export function ShareCard({ item, format, anim }: { item: Item; format: Format; anim?: boolean }) {
  const { w, h } = formatSize[format]
  const status = item.state.status
  if (format === 'og') {
    return (
      <div className="rc" style={{ width: w, height: h, padding: 64, display: 'flex', gap: 48, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={mono(24)}><Flag code={item.country} className="fl" /> {item.domain ?? item.category}</p>
          <div>
            <p className="an" style={{ fontSize: 92, lineHeight: 0.98 }}>Is BD banned {prep(item.category)} {placeName(item)}?</p>
            <p style={{ font: '800 40px/1.2 system-ui, sans-serif', color: '#fff', margin: '18px 0 0' }}>{headline.en[status]} {scope(item)}.</p>
          </div>
          <Footer item={item} px={34} />
        </div>
        <div style={{ alignSelf: 'center', fontSize: 340 }}><StatusIcon status={status} /></div>
      </div>
    )
  }
  const story = format === 'story'
  const px = story ? 46 : 42
  return (
    <div className={`rc${anim ? ' anim' : ''}`} style={{ width: w, height: h, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {item.photo && story && (
        <div className="duo" style={{ height: 760, flex: 'none' }}>
          <img src={item.photo.src} alt="" />
          <span className="credit" style={{ fontSize: 22, padding: '6px 10px', right: 24, top: 24 }}>{item.photo.credit}</span>
        </div>
      )}
      <div style={{ flex: 1, padding: story ? 80 : 70, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <p style={mono(px * 0.7)}>
          <Flag code={item.country} className="fl" /> {item.city ? `${item.city} · ` : ''}{item.country ?? 'Global'} · as of {fmtDate(TODAY)}
        </p>
        <div>
          {!item.photo || !story ? <div className="stamp-in" style={{ fontSize: story ? 150 : 120, marginBottom: 24 }}><StatusIcon status={status} /></div> : null}
          <p className="an stamp-in" style={{ fontSize: story ? 250 : 210, lineHeight: 0.88 }}>{headline.en[status]}</p>
          <p className="fade-in" style={{ font: `800 ${story ? 76 : 64}px/1.12 system-ui, sans-serif`, color: '#fff', margin: '36px 0 0' }}>{sentence(item)}</p>
          <p className="mk fade-in" style={{ fontSize: story ? 58 : 50, color: '#fff', margin: '30px 0 0', transform: 'rotate(-2deg)' }}>{scope(item)} →</p>
          <div style={{ marginTop: 28 }} className="card-strip"><MonthBlocks strip={item.strip} /></div>
        </div>
        <Footer item={item} px={px} />
      </div>
    </div>
  )
}

/** The personal "I checked my list" card. Rendered on the phone, never uploaded. */
export function ListCard({ list }: { list: Item[] }) {
  const bad = list.filter((i) => ['shut', 'disputed', 'unclear', 'restricted'].includes(i.state.status))
  return (
    <div className="rc" style={{ width: 1080, height: 1920, padding: 90, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <p style={mono(32)}>My list · as of {fmtDate(TODAY)}</p>
      <div>
        <p className="an" style={{ fontSize: 210, lineHeight: 0.92 }}>I checked my list.</p>
        <div style={{ marginTop: 60, font: '800 64px/1 system-ui, sans-serif' }}>
          {list.slice(0, 7).map((i) => (
            <div key={i.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26px 0', borderBottom: '3px solid rgba(10,10,10,.3)' }}>
              <span className={i.state.status === 'shut' ? 'strike' : ''} style={{ maxWidth: 680 }}>{i.name}</span>
              <span className="mk" style={{ fontSize: 44, color: '#fff' }}>{i.state.status === 'none' ? 'no reports' : headline.en[i.state.status].replace('.', '').toLowerCase()}</span>
            </div>
          ))}
        </div>
        <p className="mk" style={{ fontSize: 76, color: '#fff', margin: '50px 0 0', transform: 'rotate(-2deg)' }}>{bad.length} of {list.length} not safe</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="an" style={{ fontSize: 50, display: 'inline-flex', alignItems: 'center', gap: 14 }}><svg className="ic" aria-hidden="true"><use href="#i-shut" /></svg>Check yours</span>
        <span style={mono(30)}>isbdbannedhere.com</span>
      </div>
    </div>
  )
}
