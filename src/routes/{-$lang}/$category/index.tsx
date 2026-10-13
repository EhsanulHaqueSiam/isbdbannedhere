import { parseCategory } from '../../../data/rows-slug.ts'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getCategory } from '../../../data/api.ts'
import type { Status } from '../../../data/derive.ts'
import { Flag, MonthBlocks, StatusTag } from '../../../components/ui.tsx'
import { categoryLabel, dict, statusLabel } from '../../../lib/i18n.ts'
import { langParam, useLang } from '../../../lib/lang.ts'

export const Route = createFileRoute('/{-$lang}/$category/')({
  params: { parse: parseCategory },
  loader: async ({ params }) => {
    const d = await getCategory({ data: params.category })
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: `${categoryLabel.en[loaderData.category]} that shut out Bangladeshis · Is BD banned here?` }] : [] }),
  component: Category,
})

const filters: (Status | 'all')[] = ['all', 'shut', 'disputed', 'restricted', 'unclear', 'reopened', 'none']

function Category() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const [f, setF] = useState<Status | 'all'>('all')
  const list = f === 'all' ? d.list : d.list.filter((i) => i.status === f)
  return (
    <section className="pad">
      <p className="lab">{d.counts.reported} / {d.counts.total}</p>
      <h1 className="an" style={{ fontSize: 'clamp(44px, 12vw, 80px)' }}>{categoryLabel[lang][d.category]}</h1>
      <div style={{ margin: '14px 0', display: 'flex', flexWrap: 'wrap' }} role="toolbar">
        {filters.map((k) => {
          const n = k === 'all' ? d.list.length : d.list.filter((i) => i.status === k).length
          return n ? <button key={k} className={`chip${f === k ? ' on' : ''}`} onClick={() => setF(k)}>{k === 'all' ? t.seeAll : statusLabel[lang][k]} {n}</button> : null
        })}
      </div>
      {list.map((i) => (
        <Link key={i.href} to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: i.href.split('/')[1]!, id: i.id }} className="blk" style={{ display: 'block' }}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <span className="an" style={{ fontSize: 22 }}><Flag code={i.country} /> {lang === 'bn' && i.nameBn ? i.nameBn : i.name}</span>
            <StatusTag status={i.status} lang={lang} />
          </div>
          {i.status !== 'none' && <MonthBlocks strip={i.strip} />}
        </Link>
      ))}
      {list.length === 0 && <p className="body">{t.searchEmpty}</p>}
    </section>
  )
}
