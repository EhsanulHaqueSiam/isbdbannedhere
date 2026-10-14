import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { ReceiptForm } from '../../components/ReceiptForm.tsx'
import { Bar, Legend, Ribbon, Waffle, WorldMap } from '../../components/Viz.tsx'
import { Flag, Mark, StatusIcon } from '../../components/ui.tsx'
import { Favicon } from '../../components/Post.tsx'
import { Icon, useSend, useToast } from '../../components/ShareKit.tsx'
import { categoryLabel, dict, fmtDate, headline, monthName, phrase, placeName, statusLabel, type Lang } from '../../lib/i18n.ts'
import { num, shareText, storyTitle } from '../../lib/captions.ts'
import type { Status } from '../../data/derive.ts'
import type { Category } from '../../data/rows.ts'
import { countrySlug } from '../../lib/places.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { SITE, seo } from '../../lib/site.ts'

const statuses = ['shut', 'restricted', 'unclear', 'disputed', 'reopened', 'none'] as const
const cats = ['university', 'company', 'city', 'publication', 'tourism', 'country'] as const
type ListSearch = { page?: number; status?: Status; cat?: Category; country?: string; q?: string }
const PER_PAGE = 25

export const Route = createFileRoute('/{-$lang}/')({
  // The long list's filters and page live in the URL, so a filtered page can be linked. All optional.
  validateSearch: (s: Record<string, unknown>): ListSearch => ({
    ...(typeof s.page === 'number' && s.page > 1 ? { page: Math.floor(s.page) } : {}),
    ...(statuses.includes(s.status as Status) ? { status: s.status as Status } : {}),
    ...(cats.includes(s.cat as Category) ? { cat: s.cat as Category } : {}),
    ...(typeof s.country === 'string' && /^[A-Z]{2}$/.test(s.country) ? { country: s.country } : {}),
  }),
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

// Home-only words.
const words = {
  en: {
    countries: 'countries shut out or restrict Bangladeshis.',
    tapMap: 'tap the map',
    mapAlt: (n: number) => `World map. The ${n} countries where Bangladeshis are banned or restricted are black; Bangladesh is white. Each is a link.`,
    closed: (n: number, of: number) => `${n} of ${of} places we track are closed to us.`,
    waffle: 'One dot per place we track, worst first',
    byCountry: 'By country · most places first',
    newBans: 'New bans, by month',
    peak: (m: string, n: number) => `${m}: ${n} →`,
    ribbonNote: (per: number, now: number, ago: number) => `one dot ≈ ${per} places · green = reopened · ${now} closed now, ${ago} a year ago`,
    silence: (n: number, name: string) => `${n} days since ${name}'s end date passed. No word.`,
    receipts: 'Read the receipts',
    every: (n: number) => `Every place we track · ${n}`,
    everyNote: 'Worst first. Filter by status, category or country; every row opens its sources.',
    all: 'All', anyCountry: 'Any country', page: (p: number, of: number) => `Page ${p} of ${of}`, prev: '← Prev', next: 'Next →', showing: (a: number, b: number, n: number) => `${a}–${b} of ${n}`, noMatch: 'Nothing matches those filters.',
  },
  bn: {
    countries: 'দেশ বাংলাদেশিদের জন্য বন্ধ বা সীমিত।',
    tapMap: 'মানচিত্রে ট্যাপ করুন',
    mapAlt: (n: number) => `বিশ্বের মানচিত্র। যে ${num(n, 'bn')}টি দেশে বাংলাদেশিরা নিষিদ্ধ বা সীমিত সেগুলো কালো; বাংলাদেশ সাদা। প্রতিটি একটি লিংক।`,
    closed: (n: number, of: number) => `আমরা যে ${num(of, 'bn')}টি জায়গা দেখি তার ${num(n, 'bn')}টি আমাদের জন্য বন্ধ।`,
    waffle: 'প্রতিটি জায়গার জন্য একটি বিন্দু, সবচেয়ে খারাপ আগে',
    byCountry: 'দেশ অনুযায়ী · বেশি জায়গা আগে',
    newBans: 'নতুন নিষেধাজ্ঞা, মাস অনুযায়ী',
    peak: (m: string, n: number) => `${m}: ${num(n, 'bn')} →`,
    ribbonNote: (per: number, now: number, ago: number) => `এক বিন্দু ≈ ${num(per, 'bn')} জায়গা · সবুজ = আবার খোলা · এখন ${num(now, 'bn')}টি বন্ধ, এক বছর আগে ${num(ago, 'bn')}টি`,
    silence: (n: number, name: string) => `${name}-এর শেষ তারিখ পেরিয়েছে ${num(n, 'bn')} দিন। কোনো খবর নেই।`,
    receipts: 'প্রমাণ দেখুন',
    every: (n: number) => `আমরা যত জায়গা দেখি · ${num(n, 'bn')}`,
    everyNote: 'সবচেয়ে খারাপ আগে। অবস্থা, ধরন বা দেশ দিয়ে ছাঁকুন; প্রতিটি সারি তার সূত্র খোলে।',
    all: 'সব', anyCountry: 'যেকোনো দেশ', page: (p: number, of: number) => `পাতা ${num(p, 'bn')}/${num(of, 'bn')}`, prev: '← আগের', next: 'পরের →', showing: (a: number, b: number, n: number) => `${num(n, 'bn')}টির ${num(a, 'bn')}–${num(b, 'bn')}`, noMatch: 'এই ছাঁকনিতে কিছু মেলেনি।',
  },
} satisfies Record<Lang, unknown>

type Story = Awaited<ReturnType<typeof getHome>>['stories'][number]
const mixedBn = 'বন্ধ বা সীমিত।'
const closedStatuses: Status[] = ['shut', 'disputed', 'restricted', 'unclear']

function Home() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const w = words[lang]
  const L = langParam(lang)
  const names = Object.fromEntries(d.countries.map((c) => [c.code, c.name[lang]]))
  const closed = closedStatuses.reduce((n, s) => n + (d.tally[s] ?? 0), 0)
  const peak = d.trend.reduce((a, b) => (b.bans > a.bans ? b : a), d.trend[0]!)
  const first = d.trend[0]!, last = d.trend.at(-1)!
  const legend: [Status, string][] = (['shut', 'restricted', 'unclear', 'disputed', 'reopened', 'none'] as const).filter((s) => d.tally[s]).map((s) => [s, `${num(d.tally[s]!, lang)} ${statusLabel[lang][s].toLowerCase()}`])
  return (
    <>
      <section className="hero-map">
        <WorldMap banned={d.countries.map((c) => c.code)} names={names} lang={lang} title={w.mapAlt(d.countries.length)} viewBox="60 0 880 360" />
        <div className="over">
          <b className="an huge hb-stamp">{num(d.countries.length, lang)}</b>
          <h1 className="an h1">{w.countries}</h1>
          <p className="lab">{t.asOf} {fmtDate(TODAY, lang)} · {num(d.totals.sources, lang)} {t.sourcesN} · {w.tapMap}</p>
        </div>
      </section>

      <div className="dgrid">
        <section className="pad">
          <h2 className="an" style={{ fontSize: 'clamp(24px, 6.8vw, 32px)' }}>{w.closed(closed, d.tracked)}</h2>
          <Waffle counts={d.tally} label={w.waffle} />
          <Legend items={legend} />
          <div style={{ marginTop: 14 }}><SearchBox lang={lang} /></div>
        </section>
        <section className="pad">
          <p className="lab">{w.byCountry}</p>
          <div className="ctab">
            {d.countries.map((c) => (
              <Link key={c.code} to="/{-$lang}/in/$country" params={{ lang: L, country: countrySlug(c.code) }} className="crow">
                <span className="nm"><Flag code={c.code} /> {c.name[lang]}</span><b>{num(c.count, lang)}</b>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="dgrid">
        <section className="pad">
          <div className="row" style={{ border: 0, padding: 0 }}><h2 className="an" style={{ fontSize: 22 }}>{w.newBans}</h2><span className="mk hot" style={{ fontSize: 16 }}>{w.peak(monthName(Number(peak.month.slice(5)), lang), peak.bans)}</span></div>
          <Ribbon data={d.trend} lang={lang} />
          <p className="lab" style={{ marginTop: 8 }}>{w.ribbonNote(3, last.closed, first.closed)}</p>
          {d.silent.slice(0, 2).map((s) => (
            <Link key={s.href} to="/{-$lang}/$category/$id" params={{ lang: L, category: s.href.split('/')[1]!, id: s.id }} className="lab" style={{ display: 'block', marginTop: 8 }}>
              <StatusIcon status="unclear" /> {w.silence(s.days ?? 0, lang === 'bn' && s.nameBn ? s.nameBn : s.name)} →
            </Link>
          ))}
        </section>
        <section className="pad">
          <div className="bignums">
            {d.tiles.map((c) => (
              <Link key={c.category} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c.category] }} className="bn">
                <b>{num(c.reported - c.reopened, lang)}</b>
                <span className="an nm">{categoryLabel[lang][c.category]}</span>
                <Bar counts={{ shut: c.shut, disputed: c.disputed, restricted: c.restricted, unclear: c.unclear, reopened: c.reopened, none: c.total - c.reported }} label={`${c.shut} ${statusLabel[lang].shut}, ${c.restricted} ${statusLabel[lang].restricted}, ${c.reopened} ${statusLabel[lang].reopened}`} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <BigList d={d} lang={lang} />

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

/** Every place, worst first, with status, category and country filters and 25 a page. Filters and page sit in the URL. */
function BigList({ d, lang }: { d: Awaited<ReturnType<typeof getHome>>; lang: Lang }) {
  const t = dict[lang]
  const w = words[lang]
  const L = langParam(lang)
  const q = Route.useSearch()
  const navigate = Route.useNavigate()
  const names = Object.fromEntries(d.countries.map((c) => [c.code, c.name[lang]]))
  const codes = [...new Set(d.list.map((i) => i.country).filter((c): c is string => !!c))].sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b))
  const list = d.list.filter((i) => (!q.status || i.status === q.status) && (!q.cat || i.category === q.cat) && (!q.country || i.country === q.country))
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const page = Math.min(q.page ?? 1, pages)
  const rows = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const to = (patch: Partial<ListSearch>) => ({ to: '/{-$lang}' as const, params: { lang: L }, search: { ...q, page: undefined, ...patch }, hash: 'every' })
  const count = (f: (i: (typeof d.list)[number]) => boolean) => d.list.filter(f).length
  const pageLinks = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))]
  return (
    <section className="pad" id="every" style={{ scrollMarginTop: 12 }}>
      <h2 className="an" style={{ fontSize: 28 }}>{w.every(d.list.length)}</h2>
      <p className="lab">{w.everyNote}</p>
      <div className="filters" role="toolbar">
        <Link {...to({ status: undefined })} className={`chip${q.status ? '' : ' on'}`} style={{ margin: 0 }}>{w.all} {num(d.list.length, lang)}</Link>
        {statuses.filter((st) => count((i) => i.status === st)).map((st) => <Link key={st} {...to({ status: st })} className={`chip${q.status === st ? ' on' : ''}`} style={{ margin: 0 }}><StatusIcon status={st} /> {statusLabel[lang][st]} {num(count((i) => i.status === st), lang)}</Link>)}
      </div>
      <div className="filters">
        {cats.map((c) => <Link key={c} {...to({ cat: q.cat === c ? undefined : c })} className={`chip${q.cat === c ? ' on' : ''}`} style={{ margin: 0 }}>{categoryLabel[lang][c]} {num(count((i) => i.category === c), lang)}</Link>)}
        <select aria-label={w.anyCountry} value={q.country ?? ''} onChange={(e) => void navigate(to({ country: e.target.value || undefined }))}>
          <option value="">{w.anyCountry}</option>
          {codes.map((c) => <option key={c} value={c}>{names[c] ?? c}</option>)}
        </select>
      </div>
      <div className="cat-list" style={{ marginTop: 8 }}>
        {rows.map((i) => (
          <Link key={i.href} to="/{-$lang}/$category/$id" params={{ lang: L, category: i.href.split('/')[1]!, id: i.id }} className="lrow">
            <span className="mk hot">{i.since ? fmtDate(i.since, lang) : statusLabel[lang].none}</span>
            <span className="an nm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mark domain={i.domain} country={i.country} size={26} /><span>{lang === 'bn' && i.nameBn ? i.nameBn : placeName(i)}</span></span>
            <span className="sen">{statusLabel[lang][i.status]} · {categoryLabel[lang][i.category]}{i.city ? ` · ${i.city}` : i.country ? ` · ${names[i.country] ?? i.country}` : ''}{i.sources ? ` · ${num(i.sources, lang)} ${lang === 'en' && i.sources === 1 ? 'source' : t.sourcesN}` : ''}</span>
            <StatusIcon status={i.status} />
          </Link>
        ))}
      </div>
      {rows.length === 0 && <p className="body" style={{ marginTop: 12 }}>{w.noMatch}</p>}
      <nav className="pager" aria-label={w.page(page, pages)}>
        <Link {...to({ page: page > 2 ? page - 1 : undefined })} className={page === 1 ? 'dis' : ''}>{w.prev}</Link>
        {pageLinks.map((p, k) => <span key={p} style={{ display: 'contents' }}>{k > 0 && p - pageLinks[k - 1]! > 1 && <span>…</span>}<Link {...to({ page: p > 1 ? p : undefined })} className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined}>{num(p, lang)}</Link></span>)}
        <Link {...to({ page: page + 1 })} className={page === pages ? 'dis' : ''}>{w.next}</Link>
        <span className="lab">{w.showing(list.length ? (page - 1) * PER_PAGE + 1 : 0, Math.min(page * PER_PAGE, list.length), list.length)}</span>
      </nav>
    </section>
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
