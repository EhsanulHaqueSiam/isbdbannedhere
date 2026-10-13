import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { Flag, MonthBlocks, StatusIcon } from '../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, headline, statusLabel } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'

export const Route = createFileRoute('/{-$lang}/')({
  loader: () => getHome(),
  head: () => ({
    meta: [
      { title: "Is BD banned here? Where Bangladeshis are shut out, with receipts" },
      { property: 'og:title', content: "Where we're banned right now." },
      { property: 'og:image', content: '/cards/home-og.png' },
    ],
  }),
  component: Home,
})

function Chart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(4, ...data.map((d) => d.count))
  const W = 320, H = 120, x = (i: number) => 8 + (i * (W - 16)) / Math.max(1, data.length - 1), y = (v: number) => H - 18 - (v / max) * (H - 34)
  const path = data.map((d, i) => `${i ? `H${x(i)}V${y(d.count)}` : `M${x(0)} ${y(d.count)}`}`).join('')
  const last = data.at(-1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Places closed to Bangladeshis by month, now ${last?.count ?? 0}`}>
      <line x1="8" y1={H - 18} x2={W - 8} y2={H - 18} stroke="var(--ch)" />
      <path d={path} fill="none" stroke="var(--cx)" strokeWidth="2.5" strokeLinejoin="round" />
      {last && <circle cx={x(data.length - 1)} cy={y(last.count)} r="4.5" fill="var(--cx)" stroke="var(--pp)" strokeWidth="2" />}
      <g fontFamily="ui-monospace,Menlo,monospace" fontSize="9" fill="var(--c2)">
        <text x="8" y={H - 4}>{data[0]?.month}</text>
        <text x={W - 8} y={H - 4} textAnchor="end">{last?.month}</text>
        {last && <text x={x(data.length - 1) - 8} y={y(last.count) - 8} textAnchor="end" fontWeight="700" fill="var(--pon)">{last.count} now</text>}
      </g>
    </svg>
  )
}

function Home() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const L = langParam(lang)
  return (
    <>
      <div className="tick">● {fmtDate(TODAY, lang)} · {d.totals.sources} {t.sourcesN}</div>
      <section className="pad">
        <h1 className="an" style={{ fontSize: 'clamp(48px, 14vw, 96px)', lineHeight: 0.96 }}>
          {t.heroA} <span className="hot">{t.heroB}</span> {t.heroC}
        </h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0 10px' }}>
          {d.flags.map((c) => <Flag key={c} code={c} className="fl" />)}
        </div>
        <p className="lab">{d.totals.places} {t.places} · {d.totals.categories} {t.categoriesN} · {d.totals.reopened} {t.reopenedN}</p>
        <div style={{ marginTop: 16 }}><SearchBox lang={lang} /></div>
        <Link to="/{-$lang}/list" params={{ lang: L }} className="btn">{t.checkList} →</Link>
      </section>

      <section className="pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {d.tiles.map((c) => (
          <Link key={c.category} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c.category] }} className="pn" style={{ padding: 12, display: 'block' }}>
            <p className="lab">{categoryLabel[lang][c.category]}</p>
            <p className="an" style={{ fontSize: 40, color: c.reported ? 'var(--xx)' : undefined }}>{c.reported}</p>
            <p className="lab" style={{ marginTop: 4 }}>
              {c.total === 0 ? t.noEntries : c.reported === 0 && c.reopened === 0 ? `${c.total} ${statusLabel[lang].none.toLowerCase()}` : [c.shut && `${c.shut} ${statusLabel[lang].shut}`, c.restricted && `${c.restricted} ${statusLabel[lang].restricted}`, c.disputed && `${c.disputed} ${statusLabel[lang].disputed}`, c.unclear && `${c.unclear} ${statusLabel[lang].unclear}`, c.reopened && `${c.reopened} ${statusLabel[lang].reopened}`].filter(Boolean).join(' · ')}
            </p>
          </Link>
        ))}
      </section>

      <section className="panel pn">
        <p className="an" style={{ fontSize: 22 }}>{t.closedOverTime}</p>
        <Chart data={d.chart} />
      </section>

      {d.silent.length > 0 && (
        <section className="pad">
          {d.silent.slice(0, 3).map((s) => (
            <Link key={s.href} to="/{-$lang}/$category/$id" params={{ lang: L, category: s.href.split('/')[1]!, id: s.id }} className="pn" style={{ display: 'block', padding: 14, marginBottom: 8 }}>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <span className="an" style={{ fontSize: 22 }}>{lang === 'bn' && s.nameBn ? s.nameBn : s.name}</span>
                <span className="an" style={{ fontSize: 36, color: 'var(--xx)' }}>{s.days}</span>
              </div>
              <p className="lab">{t.silence}</p>
            </Link>
          ))}
        </section>
      )}

      <section className="pad">
        <h2 className="an" style={{ fontSize: 32 }}>{t.latest}</h2>
        {d.feed.map((f, i) => (
          <Link key={i} to="/{-$lang}/$category/$id" params={{ lang: L, category: f.item.href.split('/')[1]!, id: f.item.id }} className="blk" style={{ display: 'block' }}>
            <span className="cat">{categoryLabel[lang][f.item.category]}</span>
            <div className="row" style={{ border: 0, padding: '6px 0 0' }}>
              <span className="an" style={{ fontSize: 20, lineHeight: 1.05 }}><Flag code={f.item.country} /> {lang === 'bn' && f.item.nameBn ? f.item.nameBn : f.item.name}: {headline[lang][f.item.status]}</span>
              <StatusIcon status={f.item.status} size={16} />
            </div>
            <p className="body" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{lang === 'bn' && f.summaryBn ? f.summaryBn : f.summary}</p>
            <p className="lab" style={{ marginTop: 4 }}>{fmtDate(f.date, lang)} · {f.publisher}{f.sources > 1 ? ` +${f.sources - 1}` : ''}</p>
            <MonthBlocks strip={f.item.strip} />
          </Link>
        ))}
      </section>
    </>
  )
}
