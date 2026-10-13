import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { ReceiptForm } from '../../components/ReceiptForm.tsx'
import { TrendChart } from '../../components/Trend.tsx'
import { Flag, Mark, StatusIcon } from '../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, headline, phrase, placeName, statusLabel } from '../../lib/i18n.ts'
import type { Status } from '../../data/derive.ts'
import { BD_PATH, BD_VIEWBOX } from '../../lib/bd-outline.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { SITE, seo } from '../../lib/site.ts'

export const Route = createFileRoute('/{-$lang}/')({
  loader: () => getHome(),
  head: ({ params, loaderData }) => {
    const lang = langOf(params)
    const n = loaderData ? `${loaderData.totals.places} places in ${loaderData.countries.length} countries` : 'Places'
    return seo({
      path: '/',
      lang,
      title: lang === 'bn' ? 'বাংলাদেশ কি এখানে নিষিদ্ধ? যেখানে বাংলাদেশিরা এখন নিষিদ্ধ' : 'Is BD banned here? Visa, university and company bans on Bangladeshis',
      ogTitle: lang === 'bn' ? 'যেখানে বাংলাদেশিরা এখন নিষিদ্ধ।' : 'Where Bangladeshis are banned right now.',
      description: `${n} shut out or restrict Bangladeshis: visas, universities, companies, cities. Every entry links its sources. As of ${fmtDate(TODAY)}.`,
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Is BD banned here?', url: `${SITE}/`, inLanguage: ['en', 'bn'] }],
    })
  },
  component: Home,
})

// Tile breakdown order, worst first.
const tileStatuses = ['shut', 'disputed', 'restricted', 'unclear', 'reopened'] as const satisfies Status[]

function Home() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const L = langParam(lang)
  // A tapped country chip fills the search box with that country.
  const [preset, setPreset] = useState<{ q: string } | null>(null)
  return (
    <>
      <div className="tick">● {fmtDate(TODAY, lang)} · {d.totals.sources} {t.sourcesN}</div>
      <section className="pad hero">
        <svg className="hero-map" viewBox={BD_VIEWBOX} aria-hidden="true">
          <path d={BD_PATH} />
          <g><circle cx="52" cy="66" r="44" /><line x1="21" y1="35" x2="83" y2="97" /></g>
        </svg>
        <div className="hero-main">
        <Flag code="BD" className="fl hero-flag" title="Bangladesh" />
        <h1 className="an" style={{ fontSize: 'clamp(44px, 13vw, 96px)', lineHeight: 0.96, marginTop: 10 }}>
          {t.heroA} <span className="hot">{t.heroB}</span> {t.heroC}
        </h1>
        <p className="lab" style={{ margin: '16px 0 8px' }}>{t.bannedIn(d.countries.length)}</p>
        <div className="chips">
          {d.countries.map((c) => (
            <button key={c.code} className="cc" onClick={() => setPreset({ q: c.name.en })}>
              <Flag code={c.code} /> {c.name[lang]}<b>{c.count}</b>
            </button>
          ))}
        </div>
        <p className="lab" style={{ marginTop: 12 }}>{d.totals.places} {t.places} · {d.countries.length} {t.countriesN} · {d.totals.reopened} {t.reopenedN}</p>
        <div style={{ marginTop: 16 }}><SearchBox lang={lang} preset={preset} /></div>
        <Link to="/{-$lang}/list" params={{ lang: L }} className="btn">{t.checkList} →</Link>
        </div>
      </section>

      <section className="pad tiles">
        {d.tiles.map((c) => (
          <Link key={c.category} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c.category] }} className="pn tile">
            <p className="an" style={{ fontSize: 22 }}>{categoryLabel[lang][c.category]}</p>
            <p className="an tile-n" style={{ color: c.reported ? undefined : 'var(--pon2)' }}>{c.reported}</p>
            <p className="lab" style={{ margin: '2px 0 8px' }}>{c.total === 0 ? t.noEntries : t.withReport}</p>
            {tileStatuses.filter((s) => c[s]).map((s) => (
              <p key={s} className="tile-row"><StatusIcon status={s} /><b>{c[s]}</b> {statusLabel[lang][s].toLowerCase()}</p>
            ))}
            {c.total > 0 && c.reported === 0 && <p className="tile-row"><b>{c.total}</b> {statusLabel[lang].none.toLowerCase()}</p>}
          </Link>
        ))}
      </section>

      <div className="home-cols">
      <div className="home-side">
      <section className="panel pn">
        <p className="an" style={{ fontSize: 22 }}>{t.closedOverTime}</p>
        <TrendChart data={d.trend} />
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

      </div>
      <section className="pad">
        <h2 className="an" style={{ fontSize: 32 }}>{t.latest}</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {d.stories.map((st, i) => {
            const lead = st.items[0]!
            const many = st.items.length > 1
            const cat = lead.href.split('/')[1]!
            const name = lang === 'bn' && lead.nameBn ? lead.nameBn : placeName(lead)
            const tag = many && st.country ? `${st.country[lang]} ${categoryLabel[lang][lead.category].toLowerCase()}` : categoryLabel[lang][lead.category]
            const words = lang === 'bn' ? headline.bn[lead.status] : phrase(lead.status, lead.category, many, st.mixed)
            const body = (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {many ? <span className="an" style={{ fontSize: 54, lineHeight: 0.9, color: 'var(--xx)' }}>{st.items.length}</span> : <Mark domain={lead.domain} country={lead.country} size={48} title={lead.name} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="cat">{tag}</span>
                    <p className="ttl">{many ? words : <><span className="an">{name}</span> · {words}</>}</p>
                  </div>
                  <StatusIcon status={lead.status} size={30} />
                </div>
                {many && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                    {st.items.slice(0, 8).map((it) => <Mark key={it.href} domain={it.domain} country={it.country} size={30} title={it.name} />)}
                    {st.items.length > 8 && <span className="lab">+{st.items.length - 8}</span>}
                  </div>
                )}
                <p className="clamp2" style={{ fontSize: 15, lineHeight: 1.4, margin: '10px 0 0', color: 'var(--pon2)' }}>{lang === 'bn' && st.summaryBn ? st.summaryBn : st.summary}</p>
                <p className="lab" style={{ marginTop: 8 }}>{fmtDate(st.date, lang)} · {st.publisher} · {st.sources} {lang === 'en' && st.sources === 1 ? 'source' : t.sourcesN}</p>
              </>
            )
            return many ? (
              <Link key={i} to="/{-$lang}/$category" params={{ lang: L, category: cat }} className="pn" style={{ display: 'block', padding: 14 }}>{body}</Link>
            ) : (
              <Link key={i} to="/{-$lang}/$category/$id" params={{ lang: L, category: cat, id: lead.id }} className="pn" style={{ display: 'block', padding: 14 }}>{body}</Link>
            )
          })}
        </div>
      </section>
      </div>

      <section className="pad narrow" id="send">
        <ReceiptForm lang={lang} />
      </section>
    </>
  )
}
