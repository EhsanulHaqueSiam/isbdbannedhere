import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { SearchBox } from '../../components/Search.tsx'
import { ReceiptForm } from '../../components/ReceiptForm.tsx'
import { TrendChart } from '../../components/Trend.tsx'
import { Flag, Mark, StatusIcon } from '../../components/ui.tsx'
import { Icon, shareOrSave, useSend, useToast } from '../../components/ShareKit.tsx'
import { categoryLabel, dict, fmtDate, headline, phrase, placeName, statusLabel, type Lang } from '../../lib/i18n.ts'
import { num, shareText, storyTitle } from '../../lib/captions.ts'
import type { Status } from '../../data/derive.ts'
import { BD_PATH, BD_VIEWBOX } from '../../lib/bd-outline.ts'
import { countrySlug } from '../../lib/places.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { SITE, ogImage, seo } from '../../lib/site.ts'
import { track } from '../../lib/track.ts'

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

// Home-only words. Tool pages live at these paths (and under /bn).
const words = {
  en: {
    tap: 'Tap a country to see every ban there',
    receipts: 'Read the receipts',
    more: (n: number) => `+${n} more`,
    tools: 'Tools',
    toolList: [['/check', 'Am I affected?'], ['/compare', 'Compare countries'], ['/frame', 'Profile frame'], ['/week', 'This week'], ['/share', 'For group admins']],
    map: 'Where Bangladeshis are banned',
    mapAlt: (n: number) => `World map. The ${n} countries where Bangladeshis are banned or restricted are black; Bangladesh is white.`,
    banned: 'Banned or restricted',
    bd: 'Bangladesh',
    getMap: 'Share the map',
  },
  bn: {
    tap: 'যেকোনো দেশে ট্যাপ করে সেখানের সব নিষেধাজ্ঞা দেখুন',
    receipts: 'প্রমাণ দেখুন',
    more: (n: number) => `আরও ${num(n, 'bn')}টি`,
    tools: 'টুল',
    toolList: [['/check', 'আমার ওপর কি প্রভাব পড়বে?'], ['/compare', 'দেশ তুলনা'], ['/frame', 'প্রোফাইল ফ্রেম'], ['/week', 'এই সপ্তাহ'], ['/share', 'গ্রুপ অ্যাডমিনদের জন্য']],
    map: 'যেখানে বাংলাদেশিরা নিষিদ্ধ',
    mapAlt: (n: number) => `বিশ্বের মানচিত্র। যে ${num(n, 'bn')}টি দেশে বাংলাদেশিরা নিষিদ্ধ বা সীমিত সেগুলো কালো; বাংলাদেশ সাদা।`,
    banned: 'নিষিদ্ধ বা সীমিত',
    bd: 'বাংলাদেশ',
    getMap: 'মানচিত্র শেয়ার করুন',
  },
} satisfies Record<Lang, unknown>

type Story = Awaited<ReturnType<typeof getHome>>['stories'][number]
const mixedBn = 'বন্ধ বা সীমিত।'

/** The map's preview image (scripts/seo.ts) to the phone's share sheet, or a download where there is none. */
async function shareMap(lang: Lang, text: string) {
  const res = await fetch(ogImage(lang === 'bn' ? 'bn/map' : 'map')).catch(() => null)
  if (!res?.ok) return
  const r = await shareOrSave(new File([await res.blob()], 'isbdbannedhere-map.png', { type: 'image/png' }), text)
  if (r) track('share_done', { channel: r, format: 'og', card: 'map' })
}

function Home() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const w = words[lang]
  const L = langParam(lang)
  const pre = lang === 'bn' ? '/bn' : ''
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
        <h1 className="an hb-stamp" style={{ fontSize: 'clamp(44px, 13vw, 96px)', lineHeight: 0.96, marginTop: 10 }}>
          {t.heroA} <span className="hot">{t.heroB}</span> {t.heroC}
        </h1>
        <p className="lab" style={{ margin: '16px 0 8px' }}>{t.bannedIn(d.countries.length)} · {w.tap}</p>
        <div className="chips">
          {d.countries.map((c, i) => (
            <Link key={c.code} to="/{-$lang}/in/$country" params={{ lang: L, country: countrySlug(c.code) }} className="cc hb-up" style={{ '--i': i } as React.CSSProperties}>
              <Flag code={c.code} /> {c.name[lang]}<b>{c.count}</b><span className="chev" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
        <p className="lab" style={{ marginTop: 12 }}>{d.totals.places} {t.places} · {d.countries.length} {t.countriesN} · {d.totals.reopened} {t.reopenedN}</p>
        <div style={{ marginTop: 16 }}><SearchBox lang={lang} /></div>
        <Link to="/{-$lang}/list" params={{ lang: L }} className="btn">{t.checkList} →</Link>
        </div>
      </section>

      <section className="pad tiles">
        {d.tiles.map((c, i) => (
          <Link key={c.category} to="/{-$lang}/$category" params={{ lang: L, category: slugOf[c.category] }} className="pn tile hb-up" style={{ '--i': i } as React.CSSProperties}>
            <p className="an" style={{ fontSize: 22 }}>{categoryLabel[lang][c.category]}</p>
            <p className="an tile-n" style={{ color: c.reported ? undefined : 'var(--pon2)' }}>{c.reported}</p>
            <p className="lab" style={{ margin: '2px 0 8px' }}>{c.total === 0 ? t.noEntries : t.withReport}</p>
            {tileStatuses.filter((s) => c[s]).map((s) => (
              <p key={s} className="tile-row"><StatusIcon status={s} /><b>{c[s]}</b> {statusLabel[lang][s].toLowerCase()}</p>
            ))}
            {c.total > 0 && c.reported === 0 && <p className="tile-row"><b>{c.total}</b> {statusLabel[lang].none.toLowerCase()}</p>}
            <p className="more hb-more">{t.seeAll}<span className="chev" aria-hidden="true">→</span></p>
          </Link>
        ))}
      </section>

      <nav className="pad hb-tools" aria-label={w.tools}>
        {w.toolList.map(([path, label]) => <a key={path} href={`${pre}${path}`}>{label} →</a>)}
      </nav>

      <div className="home-cols">
      <div className="home-side">
      <section className="panel pn">
        <p className="an" style={{ fontSize: 22 }}>{t.closedOverTime}</p>
        <TrendChart data={d.trend} />
      </section>

      <section className="pad hb-map">
        <h2 className="an" style={{ fontSize: 26 }}>{w.map}</h2>
        <img src="/map.svg" width={1000} height={440} loading="lazy" decoding="async" alt={w.mapAlt(d.countries.length)} />
        <p className="lab hb-legend"><i className="k" /> {w.banned} · {num(d.countries.length, lang)} <i className="w" /> {w.bd}</p>
        <button type="button" className="btn out" onClick={() => void shareMap(lang, w.map)}><Icon name="share" />{w.getMap}</button>
      </section>

      {d.silent.length > 0 && (
        <section className="pad">
          {d.silent.slice(0, 3).map((s) => (
            <Link key={s.href} to="/{-$lang}/$category/$id" params={{ lang: L, category: s.href.split('/')[1]!, id: s.id }} className="pn hb-lift" style={{ display: 'block', padding: 14, marginBottom: 8 }}>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <span className="an" style={{ fontSize: 22 }}>{lang === 'bn' && s.nameBn ? s.nameBn : s.name}</span>
                <span className="an" style={{ fontSize: 36, color: 'var(--xx)' }}>{s.days}</span>
              </div>
              <p className="lab">{t.silence}</p>
              <p className="more hb-more">{t.details}<span className="chev" aria-hidden="true">→</span></p>
            </Link>
          ))}
        </section>
      )}

      </div>
      <section className="pad">
        <h2 className="an" style={{ fontSize: 32 }}>{t.latest}</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {d.stories.map((st, i) => <StoryCard key={i} st={st} lang={lang} />)}
        </div>
      </section>
      </div>

      <section className="pad narrow" id="send">
        <ReceiptForm lang={lang} />
      </section>
    </>
  )
}

/**
 * One story in the feed. No card-wide link: the title opens the entry (or the category, for a cluster), and every
 * logo and name in a cluster opens its own entry, so nothing nests. The share button sits beside the receipts link.
 */
function StoryCard({ st, lang }: { st: Story; lang: Lang }) {
  const t = dict[lang]
  const w = words[lang]
  const L = langParam(lang)
  const lead = st.items[0]!
  const many = st.items.length > 1
  const cat = lead.href.split('/')[1]!
  const nameOf = (it: Story['items'][number]) => (lang === 'bn' && it.nameBn ? it.nameBn : placeName(it))
  const tag = many && st.country ? `${st.country[lang]} ${categoryLabel[lang][lead.category].toLowerCase()}` : categoryLabel[lang][lead.category]
  // A cluster mixing bans and restrictions never reads "Banned." (DESIGN.md: never stronger than the data).
  const says = lang === 'bn' ? (st.mixed ? mixedBn : headline.bn[lead.status]) : phrase(lead.status, lead.category, many, st.mixed)
  const entry = (it: Story['items'][number], children: React.ReactNode, className = 'hb-a') => (
    <Link key={it.href} to="/{-$lang}/$category/$id" params={{ lang: L, category: it.href.split('/')[1]!, id: it.id }} className={className}>{children}</Link>
  )
  const top = (children: React.ReactNode) => (many ? <Link to="/{-$lang}/$category" params={{ lang: L, category: cat }} className="hb-a">{children}</Link> : entry(lead, children))
  return (
    <article className="pn hb-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {many ? <span className="an" style={{ fontSize: 54, lineHeight: 0.9, color: 'var(--xx)' }}>{st.items.length}</span> : entry(lead, <Mark domain={lead.domain} country={lead.country} size={48} title={lead.name} />, 'hb-logo')}
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="cat">{tag}</span>
          <p className="ttl">{top(many ? says : <><span className="an">{nameOf(lead)}</span> · {says}</>)}</p>
        </div>
        <StatusIcon status={lead.status} size={30} />
      </div>
      {many && (
        <>
          <div className="hb-logos">
            {st.items.slice(0, 8).map((it) => entry(it, <Mark domain={it.domain} country={it.country} size={30} title={it.name} />, 'hb-logo'))}
          </div>
          <p className="hb-names">
            {st.items.slice(0, 2).map((it) => entry(it, <>{nameOf(it)} →</>))}
            {st.items.length > 2 && <Link to="/{-$lang}/$category" params={{ lang: L, category: cat }} className="hb-a">{w.more(st.items.length - 2)} →</Link>}
          </p>
        </>
      )}
      <p className="clamp2" style={{ fontSize: 15, lineHeight: 1.4, margin: '10px 0 0', color: 'var(--pon2)' }}>{lang === 'bn' && st.summaryBn ? st.summaryBn : st.summary}</p>
      <p className="lab" style={{ marginTop: 8 }}>{fmtDate(st.date, lang)} · {st.publisher} · {st.sources} {lang === 'en' && st.sources === 1 ? 'source' : t.sourcesN}</p>
      <div className="hb-foot">
        {top(<span className="more">{w.receipts}<span className="chev" aria-hidden="true">→</span></span>)}
        <StoryShare st={st} lang={lang} path={many ? `/${cat}` : lead.href} />
      </div>
    </article>
  )
}

/** "Share" opens a short channel list in place (WhatsApp first); each channel opens in its own tab or app. */
function StoryShare({ st, lang, path }: { st: Story; lang: Lang; path: string }) {
  const { toast, say } = useToast()
  const s = shareText[lang]
  const lead = st.items[0]!
  const story = { status: lead.status, category: lead.category, items: st.items, place: st.country }
  const en = st.mixed ? `${phrase(lead.status, lead.category, true, true)}.` : headline.en[lead.status]
  const text = `${storyTitle(story, 'bn')}: ${st.mixed ? mixedBn : headline.bn[lead.status]}\n${storyTitle(story, 'en')}: ${en}`
  const url = `${SITE || (typeof location === 'undefined' ? '' : location.origin)}${lang === 'bn' ? '/bn' : ''}${path}`
  const send = useSend({ lang, text, url, card: path.slice(1).replace('/', '-'), format: 'link', say })
  return (
    <details className="hb-share">
      <summary><Icon name="share" size={16} />{dict[lang].share}</summary>
      <div>
        {(['whatsapp', 'facebook', 'messenger', 'x', 'telegram', 'copy'] as const).map((ch) => (
          <button key={ch} type="button" className={`hb-ch ch-${ch}`} onClick={() => void send(ch)}>
            <Icon name={ch} size={16} /><span>{ch === 'facebook' ? (lang === 'bn' ? 'ফেসবুক' : 'Facebook') : s.channels[ch]}</span>
          </button>
        ))}
      </div>
      {toast}
    </details>
  )
}
