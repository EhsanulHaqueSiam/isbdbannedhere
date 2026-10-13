import { parseCategory } from '../../../data/rows-slug.ts'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getItem } from '../../../data/api.ts'
import { rowsByCategory } from '../../../data/rows.ts'
import { months } from '../../../data/derive.ts'
import { TODAY } from '../../../data/today.ts'
import { scope, sentence } from '../../../components/Card.tsx'
import { ShareSheet } from '../../../components/ShareSheet.tsx'
import { Flag, Mark, MonthBlocks, StatusIcon, StatusTag } from '../../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, headline, nextSteps, rowLabel } from '../../../lib/i18n.ts'
import { langParam, useLang } from '../../../lib/lang.ts'
import { SITE, cardPath } from '../../../lib/site.ts'

const contact = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

export const Route = createFileRoute('/{-$lang}/$category/$id')({
  params: { parse: parseCategory },
  loader: async ({ params }) => {
    const d = await getItem({ data: { slug: params.category, id: params.id } })
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { item } = loaderData
    const title = `Is BD banned at ${item.name}? ${headline.en[item.state.status]}`
    const desc = `${sentence(item)} As of ${fmtDate(TODAY)}, ${item.conf.sources} sources.`
    return {
      meta: [
        { title },
        { name: 'description', content: desc },
        { property: 'og:title', content: `Is BD banned at ${item.name}?` },
        { property: 'og:description', content: desc },
        { property: 'og:image', content: `${SITE}${cardPath(item.category, item.id, 'og')}` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:url', content: `${SITE}${item.href}` },
        { property: 'og:type', content: 'article' },
      ],
      links: [{ rel: 'canonical', href: `${SITE}${item.href}` }],
    }
  },
  component: Entity,
})

function Entity() {
  const { item, stillOpen } = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const [sharing, setSharing] = useState(false)
  const status = item.state.status
  const name = lang === 'bn' && item.nameBn ? item.nameBn : item.name
  const m = months(TODAY)
  const sources = [...new Map(item.events.flatMap((e) => e.sources).map((s) => [s.url, s])).values()]
  const mail = (subject: string) => (contact ? `mailto:${contact}?subject=${encodeURIComponent(subject)}` : undefined)

  return (
    <>
      {item.photo ? (
        <div className="duo" style={{ height: 220 }}>
          <img src={item.photo.src} alt={item.name} />
          <span className="credit">{item.photo.credit}</span>
          <p className="an stamp-in" style={{ left: 16, bottom: 10, fontSize: 'clamp(56px,18vw,96px)', lineHeight: 0.9 }}>{headline[lang][status]}</p>
        </div>
      ) : null}
      <section className="pad">
        <p className="lab"><Flag code={item.country} /> {categoryLabel[lang][item.category]}{item.city ? ` · ${item.city}` : ''}{item.domain ? ` · ${item.domain}` : ''}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
          <Mark domain={item.domain} country={item.country} size={52} />
          <h1 className="an" style={{ fontSize: 'clamp(28px, 8vw, 52px)', lineHeight: 1 }}>{name}</h1>
        </div>
        {!item.photo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <StatusIcon status={status} size={56} />
            <p className="an stamp-in" style={{ fontSize: 'clamp(52px,16vw,96px)', lineHeight: 0.9 }}>{headline[lang][status]}</p>
          </div>
        )}
        <p className="body" style={{ fontSize: 20, lineHeight: 1.2, marginTop: 12, fontWeight: 800 }}>{sentence(item)}</p>
        {status !== 'none' && <p className="mk hot" style={{ fontSize: 17, margin: '10px 0 0', transform: 'rotate(-1.5deg)' }}>{scope(item)} →</p>}
        <MonthBlocks strip={item.strip} from={fmtDate(m[0], lang)} to={fmtDate(TODAY, lang)} />
        <p className="lab" style={{ marginTop: 10 }}>
          {t.asOf} {fmtDate(TODAY, lang)} · {item.conf.best ? t.confidence[item.conf.best] : t.confidence.none} · {item.conf.sources} {lang === 'en' && item.conf.sources === 1 ? 'source' : t.sourcesN}
          {item.conf.lastSource ? ` · ${fmtDate(item.conf.lastSource, lang)}` : ''}
        </p>
        <button className="btn" onClick={() => setSharing(true)}>↗ {t.share}</button>
      </section>

      <section className="panel pn">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {rowsByCategory[item.category].map((r) => {
            const rs = item.state.rows[r]
            return (
              <div key={r}>
                <p className="an" style={{ fontSize: 18 }}>{rowLabel[lang][r]}</p>
                <StatusTag status={rs?.status ?? 'none'} lang={lang} />
                {rs?.until && <p className="lab" style={{ marginTop: 3 }}>{t.untilWord} {fmtDate(rs.until, lang)}</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="pad">
        <h2 className="an" style={{ fontSize: 26 }}>{t.nextSteps}</h2>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }} className="body">
          {nextSteps[lang][status].map((s) => <li key={s} style={{ margin: '6px 0' }}>{s}</li>)}
        </ol>
        {status === 'none' && <p className="lab" style={{ marginTop: 8 }}>{t.noReportsNote}</p>}
      </section>

      {stillOpen.length > 0 && (
        <section className="panel pn">
          <h2 className="an" style={{ fontSize: 24 }}>{t.stillOpen}</h2>
          {stillOpen.map((o) => (
            <div key={o.name} className="row">
              {o.href ? <a href={o.href} style={{ fontWeight: 700 }}>{o.name}</a> : <span style={{ fontWeight: 700 }}>{o.name}</span>}
              <span className="lab">{o.note}</span>
            </div>
          ))}
        </section>
      )}

      {item.events.length > 0 && (
        <section className="pad">
          <h2 className="an" style={{ fontSize: 26 }}>{t.history}</h2>
          {[...item.events].reverse().map((e, i) => (
            <div key={i} className="blk">
              <p className="mk hot" style={{ fontSize: 16, margin: 0 }}>{fmtDate(e.date, lang)}</p>
              <p className="body">{lang === 'bn' && e.summaryBn ? e.summaryBn : e.summary}</p>
              <p className="lab" style={{ marginTop: 4 }}>{e.sources.map((s, k) => <span key={s.url}>{k ? ' · ' : ''}<a href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{s.publisher}{s.date ? `, ${fmtDate(s.date, lang)}` : ''} ↗</a></span>)}</p>
            </div>
          ))}
        </section>
      )}

      {sources.length > 0 && (
        <section className="panel pn">
          <h2 className="an" style={{ fontSize: 24 }}>{t.receipts} · {sources.length}</h2>
          {sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="row" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.title ?? s.publisher}<br /><span className="lab">{s.publisher}{s.date ? ` · ${fmtDate(s.date, lang)}` : ''}</span></span>
              <span className="lab">{s.tier} ↗</span>
            </a>
          ))}
        </section>
      )}

      <section className="pad">
        <a className="btn out" href={mail(`Receipt: ${item.name}`) ?? '/about#receipts'}>{t.sendReceipt}</a>
        <a className="lab" style={{ display: 'block', marginTop: 12 }} href={mail(`Right of reply: ${item.name}`) ?? '/about#reply'}>{t.reply} →</a>
        <p className="lab" style={{ marginTop: 12 }}><Link to="/{-$lang}/$category" params={{ lang: langParam(lang), category: item.href.split('/')[1]! }}>← {categoryLabel[lang][item.category]}</Link></p>
      </section>

      {sharing && <ShareSheet item={item} lang={lang} onClose={() => setSharing(false)} />}
    </>
  )
}
