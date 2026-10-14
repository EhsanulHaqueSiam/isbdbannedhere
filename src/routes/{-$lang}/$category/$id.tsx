import { parseCategory, slugOf } from '../../../data/rows-slug.ts'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getItem } from '../../../data/api.ts'
import { rowsByCategory } from '../../../data/rows.ts'
import { months } from '../../../data/derive.ts'
import { TODAY } from '../../../data/today.ts'
import { QuickShare, ShareSheet } from '../../../components/ShareSheet.tsx'
import { shareText, num } from '../../../lib/captions.ts'
import { ReceiptForm } from '../../../components/ReceiptForm.tsx'
import { Flag, Mark, StatusIcon, StatusTag } from '../../../components/ui.tsx'
import { BigStrip } from '../../../components/Viz.tsx'
import { SourcePost } from '../../../components/Post.tsx'
import { categoryLabel, dict, fmtDate, headline, nextSteps, placeName, prep, rowLabel, scope, sentence, seoTitle, type Lang } from '../../../lib/i18n.ts'
import { langOf, langParam, useLang } from '../../../lib/lang.ts'
import { SITE, breadcrumbs, ogImage, seo } from '../../../lib/site.ts'

const contact = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

export const Route = createFileRoute('/{-$lang}/$category/$id')({
  params: { parse: parseCategory },
  loader: async ({ params }) => {
    const d = await getItem({ data: { slug: params.category, id: params.id } })
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const { item } = loaderData
    const lang = langOf(params)
    const slug = slugOf[item.category]
    const title = lang === 'bn' && item.nameBn ? `${item.nameBn}: ${headline.bn[item.state.status]}` : seoTitle(item)
    const sources = [...new Map(item.events.flatMap((e) => e.sources).map((s) => [s.url, s])).values()]
    const desc = `${sentence(item)}${item.state.status === 'none' ? '' : ` ${scope(item).replace(/^./, (x) => x.toUpperCase())}.`} As of ${fmtDate(TODAY)}${sources.length ? `, sources: ${[...new Set(sources.map((s) => s.publisher))].slice(0, 3).join(', ')}` : ''}.`
    const image = ogImage(slug, item.id)
    return seo({
      path: item.href,
      lang,
      title: `${title} | Is BD banned here?`,
      ogTitle: `Is BD banned ${prep(item.category)} ${placeName(item)}? ${headline.en[item.state.status]}`,
      description: desc,
      image,
      type: 'article',
      jsonLd: [
        breadcrumbs([[categoryLabel.en[item.category], `/${slug}`], [item.name, item.href]]),
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description: desc,
          image: `${SITE}${image}`,
          datePublished: item.events.map((e) => e.date).sort()[0],
          dateModified: item.checked ?? item.conf.lastSource,
          author: { '@type': 'Organization', name: 'Is BD banned here?', url: `${SITE}/` },
          // Every claim on the page, as citations: what the status is based on.
          citation: sources.map((s) => ({ '@type': 'CreativeWork', name: s.title ?? s.publisher, url: s.url, publisher: s.publisher, datePublished: s.date })),
        },
      ],
    })
  },
  component: Entity,
})

const words = {
  en: { monthsClosed: 'months closed', sources: 'sources', rowsHit: 'affected', said: 'What they said, in order', stillOpen: 'Still open', send: 'Send it to someone applying here', newer: (n: string) => `Got a newer link about ${n}?` },
  bn: { monthsClosed: 'মাস বন্ধ', sources: 'সূত্র', rowsHit: 'প্রভাবিত', said: 'তারা যা বলেছে, ক্রমানুসারে', stillOpen: 'এখনও খোলা', send: 'যে এখানে আবেদন করছে তাকে পাঠান', newer: (n: string) => `${n} নিয়ে নতুন কোনো লিংক?` },
} satisfies Record<Lang, unknown>

// Months between the first closing event and today, for the "months closed" fact.
const start = (d: string) => (d.length === 4 ? `${d}-01` : d.slice(0, 7))
const monthsBetween = (a: string, b: string) => { const [y1, m1] = start(a).split('-').map(Number), [y2, m2] = start(b).split('-').map(Number); return (y2! - y1!) * 12 + (m2! - m1!) }

function Entity() {
  const { item, stillOpen, press } = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const w = words[lang]
  const [sharing, setSharing] = useState(false)
  const status = item.state.status
  const name = lang === 'bn' && item.nameBn ? item.nameBn : item.name
  const m = months(TODAY)
  const rows = rowsByCategory[item.category]
  const hit = rows.filter((r) => item.state.rows[r]?.status === status).length
  const closing = item.events.filter((e) => ['paused', 'unavailable', 'restricted', 'extended'].includes(e.action)).map((e) => e.date).sort()[0]
  const monthsClosed = closing && status !== 'none' && status !== 'reopened' ? monthsBetween(closing, TODAY) + 1 : 0
  const events = [...item.events].sort((a, b) => b.date.localeCompare(a.date))
  const mail = (subject: string) => (contact ? `mailto:${contact}?subject=${encodeURIComponent(subject)}` : undefined)
  let shownImage = false

  return (
    <>
      <div className="entry">
        <div className="entry-main">
          <section className="pad" style={{ order: 1 }}>
            <p className="lab"><Flag code={item.country} /> {categoryLabel[lang][item.category]}{item.city ? ` · ${item.city}` : ''}{item.domain ? ` · ${item.domain}` : ''}</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
              <Mark domain={item.domain} country={item.country} size={44} />
              <h1 className="an" style={{ fontSize: 'clamp(26px, 7vw, 44px)', lineHeight: 1 }}>{name}</h1>
            </div>
            <p className="an giant stamp-in"><StatusIcon status={status} />{headline[lang][status]}</p>
            <p className="sen big">{sentence(item)}</p>
            {status !== 'none' && (
              <>
                <BigStrip strip={item.strip} months={m} label={`${fmtDate(m[0], lang)} → ${fmtDate(TODAY, lang)}: ${item.strip.join(', ')}`} />
                <p className="mk hot" style={{ fontSize: 17, margin: 0 }}>{scope(item)} →</p>
              </>
            )}
            <div className="facts3">
              {monthsClosed > 0 && <div><b>{num(monthsClosed, lang)}</b><span className="lab">{w.monthsClosed}</span></div>}
              <div><b>{num(item.conf.sources, lang)}</b><span className="lab">{item.conf.best ? t.confidence[item.conf.best] : w.sources}</span></div>
              {status !== 'none' && <div><b>{num(hit, lang)}/{num(rows.length, lang)}</b><span className="lab">{w.rowsHit}</span></div>}
            </div>
            <p className="lab" style={{ marginTop: 12 }}>{t.asOf} {fmtDate(TODAY, lang)}{item.conf.lastSource ? ` · ${t.checked} ${fmtDate(item.conf.lastSource, lang)}` : ''}</p>
          </section>

          {events.length > 0 && (
            <section className="pad" style={{ order: 3 }}>
              <p className="lab">{w.said}</p>
              <ol className="proof">
                {events.map((e, i) => (
                  <li key={i}>
                    <div style={{ minWidth: 0 }}>
                      <p className="mk hot" style={{ fontSize: 16, margin: 0 }}>{fmtDate(e.date, lang)}</p>
                      <p className="sen" style={{ marginTop: 2 }}>{lang === 'bn' && e.summaryBn ? e.summaryBn : e.summary}</p>
                      {e.sources.map((s) => {
                        const img = !shownImage && press[s.url] ? press[s.url] : undefined
                        if (img) shownImage = true
                        return <SourcePost key={s.url} source={s} lang={lang} compact={!img} image={img} />
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="pad" style={{ order: 5 }}>
            <p className="lab">{w.send}</p>
            <QuickShare item={item} lang={lang} onMore={() => setSharing(true)} />
          </section>
          <section className="pad" style={{ order: 7 }}>
            <ReceiptForm lang={lang} entity={`${item.category}/${item.id}`} title={w.newer(name)} />
            <a className="lab" style={{ display: 'block', marginTop: 16 }} href={mail(`Right of reply: ${item.name}`) ?? '/about#reply'}>{t.reply} →</a>
            <p className="lab" style={{ marginTop: 12 }}><Link to="/{-$lang}/$category" params={{ lang: langParam(lang), category: item.href.split('/')[1]! }}>← {categoryLabel[lang][item.category]}</Link></p>
          </section>
        </div>

        <div className="entry-side">
          <section className="panel pn" style={{ order: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {rows.map((r) => {
                const rs = item.state.rows[r]
                return (
                  <div key={r}>
                    <p className="an" style={{ fontSize: 18 }}>{rowLabel[lang][r]}</p>
                    <StatusTag status={rs?.status ?? 'none'} lang={lang} />
                    {rs?.since && rs.status !== 'none' && <p className="lab" style={{ marginTop: 3 }}>{t.sinceWord} {fmtDate(rs.since, lang)}{rs.until ? ` · ${t.untilWord} ${fmtDate(rs.until, lang)}` : ''}</p>}
                  </div>
                )
              })}
            </div>
          </section>
          <section className="pad" style={{ order: 4 }}>
            <p className="lab">{t.nextSteps}</p>
            <p className="sen">{nextSteps[lang][status].join(' ')}{status === 'none' ? ` ${t.noReportsNote}` : ''}</p>
          </section>
          {stillOpen.length > 0 && (
            <section className="panel pn" style={{ order: 6 }}>
              <h2 className="an" style={{ fontSize: 24 }}>{w.stillOpen}</h2>
              {stillOpen.map((o) => (
                <div key={o.name} className="row">
                  {o.href ? <a href={`${lang === 'bn' ? '/bn' : ''}${o.href}`} style={{ fontWeight: 700 }}>{o.name}</a> : <span style={{ fontWeight: 700 }}>{o.name}</span>}
                  <span className="lab">{o.note}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* phones: the share row pinned to the bottom of the screen, and room for it at the end of the page */}
      <div className="qs-space" />
      <QuickShare item={item} lang={lang} onMore={() => setSharing(true)} bar />
      {sharing && <ShareSheet item={item} lang={lang} onClose={() => setSharing(false)} />}
    </>
  )
}
