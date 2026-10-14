import { parseCategory, slugOf } from '../../../data/rows-slug.ts'
import type { Category } from '../../../data/rows.ts'
import { TODAY } from '../../../data/today.ts'
import { SITE, breadcrumbs, ogImage, seo } from '../../../lib/site.ts'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getCategory } from '../../../data/api.ts'
import type { Status } from '../../../data/derive.ts'
import { Bar, Legend } from '../../../components/Viz.tsx'
import { Mark, StatusIcon } from '../../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, phrase, statusLabel, type Lang } from '../../../lib/i18n.ts'
import { num } from '../../../lib/captions.ts'
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

// The sentence under the big number: "UK universities shut out or restrict Bangladeshi students. 23 shut the door."
const sentence: Record<Lang, (c: Category, n: { shut: number; restricted: number; reopened: number }) => string> = {
  en: (c, n) => `${phrase('shut', c, true, n.shut > 0 && n.restricted > 0).replace(/^./, (x) => x.toUpperCase())}. ${n.shut ? `${n.shut} shut the door.` : ''}${n.reopened ? ` ${n.reopened} reopened.` : ''}`,
  bn: (_c, n) => `বাংলাদেশিদের জন্য বন্ধ বা সীমিত। ${n.shut ? `${num(n.shut, 'bn')}টি একেবারে বন্ধ।` : ''}${n.reopened ? ` ${num(n.reopened, 'bn')}টি আবার খুলেছে।` : ''}`,
}

const filters: (Status | 'all')[] = ['all', 'shut', 'disputed', 'restricted', 'unclear', 'reopened', 'none']

function Category() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const [f, setF] = useState<Status | 'all'>('all')
  const list = f === 'all' ? d.list : d.list.filter((i) => i.status === f)
  const active = d.counts.reported - d.counts.reopened
  const counts = { shut: d.counts.shut, disputed: d.counts.disputed, restricted: d.counts.restricted, unclear: d.counts.unclear, reopened: d.counts.reopened, none: d.counts.total - d.counts.reported }
  return (
    <section className="pad">
      <p className="lab">{categoryLabel[lang][d.category]} · {d.counts.total} {t.tracked}</p>
      <h1 className="an giant" style={{ margin: '6px 0 0' }}>{num(active, lang)}</h1>
      <p className="sen big">{sentence[lang](d.category, d.counts)}</p>
      <div style={{ marginTop: 12 }}><Bar counts={counts} label={Object.entries(counts).map(([k, n]) => `${n} ${statusLabel[lang][k as Status]}`).join(', ')} /></div>
      <Legend items={(Object.keys(counts) as Status[]).filter((s) => counts[s]).map((s) => [s, `${num(counts[s], lang)} ${statusLabel[lang][s].toLowerCase()}`])} />
      <div style={{ margin: '14px 0 4px', display: 'flex', flexWrap: 'wrap' }} role="toolbar">
        {filters.map((k) => {
          const n = k === 'all' ? d.list.length : d.list.filter((i) => i.status === k).length
          return n ? <button key={k} className={`chip${f === k ? ' on' : ''}`} aria-pressed={f === k} onClick={() => setF(k)}>{k === 'all' ? t.seeAll : statusLabel[lang][k]} {num(n, lang)}</button> : null
        })}
      </div>
      <div className="cat-list">
        {list.map((i) => (
          <Link key={i.href} to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: i.href.split('/')[1]!, id: i.id }} className="lrow">
            <span className="mk hot">{i.since ? fmtDate(i.since, lang) : statusLabel[lang].none}</span>
            <span className="an nm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mark domain={i.domain} country={i.country} size={26} /><span>{lang === 'bn' && i.nameBn ? i.nameBn : i.name}</span></span>
            <span className="sen">{statusLabel[lang][i.status]}{i.city ? ` · ${i.city}` : ''}{i.sources ? ` · ${num(i.sources, lang)} ${lang === 'en' && i.sources === 1 ? 'source' : t.sourcesN}` : ''}</span>
            <StatusIcon status={i.status} />
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="body">{t.searchEmpty}</p>}
    </section>
  )
}
