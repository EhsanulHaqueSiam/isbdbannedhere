import { parseCategory, slugOf } from '../../../data/rows-slug.ts'
import type { Category } from '../../../data/rows.ts'
import { TODAY } from '../../../data/today.ts'
import { SITE, breadcrumbs, ogImage, seo } from '../../../lib/site.ts'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getCategory } from '../../../data/api.ts'
import { TrendChart } from '../../../components/Trend.tsx'
import type { Status } from '../../../data/derive.ts'
import { Mark, MonthBlocks, StatusTag } from '../../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, statusLabel } from '../../../lib/i18n.ts'
import { langOf, langParam, useLang } from '../../../lib/lang.ts'

export const Route = createFileRoute('/{-$lang}/$category/')({
  params: { parse: parseCategory },
  loader: async ({ params }) => {
    const d = await getCategory({ data: params.category })
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const { category, counts, list } = loaderData
    const path = `/${slugOf[category]}`
    const label = categoryLabel.en[category]
    const active = counts.reported - counts.reopened
    return seo({
      path,
      lang: langOf(params),
      title: `${listTitle[category](active)} | Is BD banned here?`,
      ogTitle: `${active} ${label.toLowerCase()}: where Bangladeshis are shut out`,
      description: `${counts.shut} shut out, ${counts.restricted} restricted, ${counts.disputed + counts.unclear} disputed or unclear, ${counts.reopened} reopened. Each with its sources, as of ${fmtDate(TODAY)}.`,
      image: ogImage(slugOf[category]),
      jsonLd: [
        breadcrumbs([[label, path]]),
        { '@context': 'https://schema.org', '@type': 'ItemList', name: label, itemListElement: list.filter((i) => i.status !== 'none').map((i, k) => ({ '@type': 'ListItem', position: k + 1, name: i.name, url: `${SITE}${i.href}` })) },
      ],
    })
  },
  component: Category,
})

// Search-shaped list titles, from what people in Bangladesh type ("uae visa for bangladeshi").
const listTitle: Record<Category, (n: number) => string> = {
  university: (n) => `${n} universities that shut out or restrict Bangladeshi students`,
  company: (n) => `${n} companies and apps that block or limit Bangladesh`,
  tourism: (n) => `Tourist visa bans on Bangladeshis: ${n} countries`,
  country: (n) => `Work and student visa bans on Bangladeshis: ${n} countries`,
  city: (n) => `${n} cities that restrict Bangladeshi visitors`,
  publication: (n) => `${n} grants, journals and payouts closed to Bangladeshis`,
}

const filters: (Status | 'all')[] = ['all', 'shut', 'disputed', 'restricted', 'unclear', 'reopened', 'none']

function Category() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const [f, setF] = useState<Status | 'all'>('all')
  const list = f === 'all' ? d.list : d.list.filter((i) => i.status === f)
  return (
    <section className="pad">
      <p className="lab">{d.counts.reported} {t.withReport} · {d.counts.total} {t.tracked}</p>
      <h1 className="an" style={{ fontSize: 'clamp(44px, 12vw, 80px)' }}>{categoryLabel[lang][d.category]}</h1>
      {d.counts.reported > 0 && <div className="pn" style={{ padding: '10px 12px', marginTop: 12 }}><TrendChart data={d.trend} compact /></div>}
      <div style={{ margin: '14px 0', display: 'flex', flexWrap: 'wrap' }} role="toolbar">
        {filters.map((k) => {
          const n = k === 'all' ? d.list.length : d.list.filter((i) => i.status === k).length
          return n ? <button key={k} className={`chip${f === k ? ' on' : ''}`} onClick={() => setF(k)}>{k === 'all' ? t.seeAll : statusLabel[lang][k]} {n}</button> : null
        })}
      </div>
      <div className="cat-list">
      {list.map((i) => (
        <Link key={i.href} to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: i.href.split('/')[1]!, id: i.id }} className="blk" style={{ display: 'block' }}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}><Mark domain={i.domain} country={i.country} size={30} /><span className="an" style={{ fontSize: 24, lineHeight: 1.05 }}>{lang === 'bn' && i.nameBn ? i.nameBn : i.name}</span></span>
            <StatusTag status={i.status} lang={lang} />
          </div>
          {i.status !== 'none' && <MonthBlocks strip={i.strip} />}
        </Link>
      ))}
      </div>
      {list.length === 0 && <p className="body">{t.searchEmpty}</p>}
    </section>
  )
}
