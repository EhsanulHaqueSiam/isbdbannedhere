import { Link } from '@tanstack/react-router'
import type { Status } from '../data/derive.ts'
import type { TrendPoint } from '../data/index.ts'
import { monthName, type Lang } from '../lib/i18n.ts'
import { num } from '../lib/captions.ts'
import { countrySlug } from '../lib/places.ts'
import { langParam } from '../lib/lang.ts'
import world from '../lib/world.json'

// The pictures of the data (DESIGN.md, v14): the world map, the waffle of every place, the month ribbon of new bans,
// the proportional bar per category and the big month strip on entries. Colours come from the context vars.

// Countries too small for the outlines are drawn as dots (lon, lat).
const dotsAt: Partial<Record<string, [number, number]>> = { BH: [50.55, 26.07], MV: [73.22, 3.2], SG: [103.82, 1.35], MT: [14.4, 35.9], QA: [51.18, 25.35] }
const paths: Record<string, string> = world.paths
const at = ([lon, lat]: [number, number]) => ({ cx: (((lon + 180) / 360) * 1000).toFixed(1), cy: (((83 - lat) / 140) * 440).toFixed(1) })

/**
 * The world, equirectangular. Countries in `banned` are drawn in the sign colour and link to their hub; Bangladesh
 * is white. `names` label the links for screen readers. Static markup, so it costs no JS after hydration.
 */
export function WorldMap({ banned, names, lang, viewBox = '60 20 880 330', title }: { banned: string[]; names: Record<string, string>; lang: Lang; viewBox?: string; title: string }) {
  const on = new Set(banned)
  const L = langParam(lang)
  return (
    <svg className="map" viewBox={viewBox} role="img" aria-label={title}>
      {Object.entries(paths).map(([code, d]) =>
        code === 'BD' ? <path key={code} d={d} className="bd" /> : on.has(code) ? (
          <Link key={code} to="/{-$lang}/in/$country" params={{ lang: L, country: countrySlug(code) }} aria-label={names[code]}>
            <path d={d} className="on"><title>{names[code]}</title></path>
          </Link>
        ) : <path key={code} d={d} className="off" />,
      )}
      {banned.filter((c) => !paths[c] && dotsAt[c]).map((c) => (
        <Link key={c} to="/{-$lang}/in/$country" params={{ lang: L, country: countrySlug(c) }} aria-label={names[c]}>
          <circle {...at(dotsAt[c]!)} r="6" className="on" stroke="#fff" strokeWidth="1.5"><title>{names[c]}</title></circle>
        </Link>
      ))}
    </svg>
  )
}

const order: Status[] = ['shut', 'disputed', 'restricted', 'unclear', 'reopened', 'none']

/** One dot per place, worst first. `counts` per status. */
export function Waffle({ counts, label }: { counts: Partial<Record<Status, number>>; label: string }) {
  return (
    <div className="waffle" role="img" aria-label={label}>
      {order.flatMap((s) => Array.from({ length: counts[s] ?? 0 }, (_, i) => <i key={`${s}${i}`} className={s} />))}
    </div>
  )
}

/** Proportional bar of statuses, for category counts. */
export function Bar({ counts, label }: { counts: Partial<Record<Status, number>>; label?: string }) {
  return (
    <div className="bar" role={label ? 'img' : undefined} aria-label={label}>
      {order.filter((s) => counts[s]).map((s) => <i key={s} className={s} style={{ flex: counts[s] }} />)}
    </div>
  )
}

/** Legend for the waffle and bars: a swatch and a count per status. */
export function Legend({ items }: { items: [Status, string][] }) {
  return (
    <p className="lab legend">
      {items.map(([s, text]) => <span key={s}><i className={s} />{text}</span>)}
    </p>
  )
}

/** New bans per month as stacked dots (one dot per `per` places), reopenings as a green dot, the count under each. */
export function Ribbon({ data, lang, per = 3 }: { data: TrendPoint[]; lang: Lang; per?: number }) {
  const peak = Math.max(...data.map((d) => d.bans))
  const last = data.at(-1)!
  const first = data[0]!
  return (
    <div className="ribbon" role="img" aria-label={`New bans per month: ${data.map((d) => `${monthName(Number(d.month.slice(5)), lang)} ${d.bans}`).join(', ')}. ${last.closed} closed now, ${first.closed} a year ago.`}>
      {data.map((d) => (
        <div key={d.month} className="col">
          <div className="dots">
            {Array.from({ length: Math.min(12, Math.ceil(d.bans / per)) }, (_, i) => <i key={i} />)}
            {d.reopened > 0 && <i className="ok" />}
          </div>
          <b className={`an${d.bans === peak && peak > 0 ? ' peak' : ''}`}>{d.bans ? num(d.bans, lang) : ''}</b>
          <span className="lab">{monthName(Number(d.month.slice(5)), lang)}</span>
        </div>
      ))}
    </div>
  )
}

/** The entry's 13 months as tall blocks with a month letter under each. */
export function BigStrip({ strip, months, label }: { strip: Status[]; months: string[]; label: string }) {
  return (
    <div className="bigstrip" role="img" aria-label={label}>
      {strip.map((s, i) => <i key={i} className={s}><span>{monthName(Number(months[i]!.slice(5)))[0]}</span></i>)}
    </div>
  )
}
