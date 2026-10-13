import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { TrendChart } from '../../components/Trend.tsx'
import { Flag, Mark, StatusIcon } from '../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, headline, statusLabel } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { SITE } from '../../lib/site.ts'

export const Route = createFileRoute('/{-$lang}/')({
  loader: () => getHome(),
  head: () => ({
    meta: [
      { title: "Is BD banned here? Where Bangladeshis are shut out, with receipts" },
      { property: 'og:title', content: "Where we're banned right now." },
      { property: 'og:image', content: `${SITE}/cards/home-og.jpg` },
      { property: 'og:url', content: `${SITE}/` },
    ],
  }),
  component: Home,
})

// Cluster headline verbs: "25 universities shut out Bangladeshi students".
const verb: Partial<Record<string, string>> = { shut: 'shut out Bangladeshis', restricted: 'restrict Bangladeshis', disputed: 'reported to bar Bangladeshis, disputed', reopened: 'reopened to Bangladeshis' }

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

      <section className="pad">
        <h2 className="an" style={{ fontSize: 32 }}>{t.latest}</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {d.stories.map((st, i) => {
            const lead = st.items[0]!
            const many = st.items.length > 1
            const cat = lead.href.split('/')[1]!
            const title = many
              ? lang === 'bn' ? `${categoryLabel.bn[lead.category]}: ${headline.bn[lead.status]}` : `${categoryLabel.en[lead.category]} ${st.mixed ? 'shut out or restrict Bangladeshis' : (verb[lead.status] ?? headline.en[lead.status])}`
              : `${lang === 'bn' && lead.nameBn ? lead.nameBn : lead.name}: ${headline[lang][lead.status]}`
            const body = (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {many ? <span className="an" style={{ fontSize: 54, lineHeight: 0.9, color: 'var(--xx)' }}>{st.items.length}</span> : <Mark domain={lead.domain} country={lead.country} size={48} title={lead.name} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="cat">{categoryLabel[lang][lead.category]}</span>
                    <p className="an" style={{ fontSize: 22, lineHeight: 1.02, marginTop: 6 }}>{title}</p>
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
    </>
  )
}
