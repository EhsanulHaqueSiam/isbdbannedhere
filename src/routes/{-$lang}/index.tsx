import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { ReceiptForm } from '../../components/ReceiptForm.tsx'
import { Mark, StatusIcon } from '../../components/ui.tsx'
import { Favicon } from '../../components/Post.tsx'
import { Icon, useSend, useToast } from '../../components/ShareKit.tsx'
import { categoryLabel, dict, fmtDate, headline, phrase, placeName, type Lang } from '../../lib/i18n.ts'
import { num, shareText, storyTitle } from '../../lib/captions.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import type { Category } from '../../data/rows.ts'
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
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Is BD banned here?', url: `${SITE}/`, inLanguage: ['en', 'bn'] },
        { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Bans and restrictions on Bangladeshis', description: 'Universities, companies, cities, publications, tourist and work visas that shut out or restrict Bangladeshis, with dated sources. CC BY 4.0.', url: `${SITE}/`, license: 'https://creativecommons.org/licenses/by/4.0/', creator: { '@type': 'Organization', name: 'Is BD banned here?' }, dateModified: TODAY, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/rss+xml', contentUrl: `${SITE}/feed.xml` }] },
      ],
    })
  },
  component: Home,
})

// Home-only words. One question, three doors, the feed. The map and charts live on /world.
const words = {
  en: {
    ask: 'Is your university, country or company banned for Bangladeshis?',
    how: 'Type a name. We show the answer and the news reports behind it.',
    doors: { country: 'Visa bans and limits on Bangladeshis', university: 'Stopped taking Bangladeshi students', company: "Don't serve or pay Bangladeshis" },
    also: 'Also',
    receipts: 'Read the receipts',
  },
  bn: {
    ask: 'আপনার বিশ্ববিদ্যালয়, দেশ বা কোম্পানি কি বাংলাদেশিদের জন্য বন্ধ?',
    how: 'নাম লিখুন। উত্তর আর তার পেছনের খবরগুলো দেখাব।',
    doors: { country: 'বাংলাদেশিদের ভিসা বন্ধ বা সীমিত', university: 'বাংলাদেশি শিক্ষার্থী নেওয়া বন্ধ', company: 'বাংলাদেশিদের সেবা বা পেমেন্ট দেয় না' },
    also: 'আরও',
    receipts: 'প্রমাণ দেখুন',
  },
} satisfies Record<Lang, unknown>

type Story = Awaited<ReturnType<typeof getHome>>['stories'][number]
const mixedBn = 'বন্ধ বা সীমিত।'

function Home() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const w = words[lang]
  const L = langParam(lang)
  const tile = (c: Category) => d.tiles.find((x) => x.category === c)!
  const active = (c: Category) => tile(c).reported - tile(c).reopened
  return (
    <>
      <section className="pad">
        <h1 className="an" style={{ fontSize: 'clamp(28px, 7.6vw, 44px)', lineHeight: 1.02 }}>{w.ask}</h1>
        <p className="sen" style={{ marginTop: 8 }}>{w.how}</p>
        <div style={{ marginTop: 12 }}><SearchBox lang={lang} /></div>
        <div className="doors">
          <Link to="/{-$lang}/world" params={{ lang: L }} className="door pn">
            <span><b className="an">{categoryLabel[lang].country}</b><span>{w.doors.country}</span></span><em className="an">{num(d.countries.length, lang)}</em>
          </Link>
          {(['university', 'company'] as const).map((c) => (
            <Link key={c} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c] }} className="door pn">
              <span><b className="an">{categoryLabel[lang][c]}</b><span>{w.doors[c]}</span></span><em className="an">{num(active(c), lang)}</em>
            </Link>
          ))}
        </div>
        <p className="lab foot-links" style={{ marginTop: 10 }}>
          <span>{w.also}:</span>
          {(['city', 'publication', 'tourism'] as const).map((c) => (
            <Link key={c} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c] }}>{categoryLabel[lang][c]} {num(active(c), lang)}</Link>
          ))}
        </p>
      </section>

      <div className="dgrid">
        <section className="pad">
          <h2 className="an" style={{ fontSize: 32 }}>{t.latest}</h2>
          {d.stories.map((st, i) => <StoryRow key={i} st={st} lang={lang} />)}
        </section>
        <section className="pad" id="send">
          <ReceiptForm lang={lang} />
        </section>
      </div>
    </>
  )
}

/**
 * One story as a dated row: date in the marker hand, the name (or "25 UK universities") in Anton, the sentence with
 * its publisher, the status icon, and a share row that opens on tap.
 */
function StoryRow({ st, lang }: { st: Story; lang: Lang }) {
  const w = words[lang]
  const L = langParam(lang)
  const lead = st.items[0]!
  const many = st.items.length > 1
  const cat = lead.href.split('/')[1]!
  const story = { status: lead.status, category: lead.category, items: st.items, place: st.country }
  // A cluster mixing bans and restrictions never reads "Banned." (DESIGN.md: never stronger than the data).
  const says = lang === 'bn' ? (st.mixed ? mixedBn : headline.bn[lead.status]) : `${phrase(lead.status, lead.category, many, st.mixed).replace(/^./, (x) => x.toUpperCase())}.`
  const name = many ? storyTitle(story, lang) : lang === 'bn' && lead.nameBn ? lead.nameBn : placeName(lead)
  const to = many ? { to: '/{-$lang}/$category' as const, params: { lang: L, category: cat } } : { to: '/{-$lang}/$category/$id' as const, params: { lang: L, category: cat, id: lead.id } }
  return (
    <details className="lrow-wrap">
      <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
        <div className="lrow">
          <span className="mk hot">{fmtDate(st.date, lang)}</span>
          <span className="an nm">{name}</span>
          <span className="sen">{says} <span className="lab"><Favicon url={st.url ?? ''} publisher={st.publisher ?? ''} /> {st.publisher}</span></span>
          {many && <span className="logos">{st.items.slice(0, 8).map((it) => <Mark key={it.href} domain={it.domain} country={it.country} size={24} title={it.name} />)}</span>}
          <StatusIcon status={lead.status} />
        </div>
      </summary>
      <div className="lrow" style={{ borderTop: 0, paddingTop: 0 }}>
        <p className="clamp2" style={{ fontSize: 14, margin: 0, color: 'var(--c2)' }}>{lang === 'bn' && st.summaryBn ? st.summaryBn : st.summary}</p>
        <StoryActs st={st} lang={lang} path={many ? `/${cat}` : lead.href} link={<Link {...to} className="hb-ch ch-more" style={{ minHeight: 36, padding: '6px 10px', fontSize: 12 }}>{w.receipts} →</Link>} />
      </div>
    </details>
  )
}

/** WhatsApp, Facebook, copy, and the link to the receipts. Each channel opens in its own tab or app. */
function StoryActs({ st, lang, path, link }: { st: Story; lang: Lang; path: string; link: React.ReactNode }) {
  const { toast, say } = useToast()
  const s = shareText[lang]
  const lead = st.items[0]!
  const story = { status: lead.status, category: lead.category, items: st.items, place: st.country }
  const en = st.mixed ? `${phrase(lead.status, lead.category, true, true)}.` : headline.en[lead.status]
  const text = `${storyTitle(story, 'bn')}: ${st.mixed ? mixedBn : headline.bn[lead.status]}\n${storyTitle(story, 'en')}: ${en}`
  const url = `${SITE || (typeof location === 'undefined' ? '' : location.origin)}${lang === 'bn' ? '/bn' : ''}${path}`
  const send = useSend({ lang, text, url, card: path.slice(1).replace('/', '-'), format: 'link', say })
  return (
    <div className="acts">
      {link}
      {(['whatsapp', 'facebook', 'copy'] as const).map((ch) => (
        <button key={ch} type="button" className={`hb-ch ch-${ch}`} onClick={() => void send(ch)}>
          <Icon name={ch} size={14} /><span>{ch === 'facebook' ? (lang === 'bn' ? 'ফেসবুক' : 'Facebook') : s.channels[ch]}</span>
        </button>
      ))}
      {toast}
    </div>
  )
}
