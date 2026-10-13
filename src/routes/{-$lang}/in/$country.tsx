import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getHub, type Hub, type HubEntry } from '../../../data/hubs.ts'
import { TODAY } from '../../../data/today.ts'
import type { Status } from '../../../data/derive.ts'
import { Flag, StatusIcon } from '../../../components/ui.tsx'
import { Icon, useSend, useToast } from '../../../components/ShareKit.tsx'
import { categoryLabel, dict, fmtDate, headline, rowLabel, statusLabel, type Lang } from '../../../lib/i18n.ts'
import { num, shareText } from '../../../lib/captions.ts'
import type { Channel } from '../../../lib/share.ts'
import { langOf, langParam, useLang } from '../../../lib/lang.ts'
import { SITE, breadcrumbs, ogImage, seo } from '../../../lib/site.ts'

// Country hub, /in/uae (and /bn/in/uae; the short link /uae redirects here, scripts/seo.ts). One verdict for the
// country, a row per entry linking to it, and a share row that sends the short link with a Bangla-first caption.

const words = {
  en: {
    visa: 'Visas',
    tourism: 'Tourist visa',
    country: 'Work and student visas',
    since: (d: string) => `since ${fmtDate(d)}`,
    send: (name: string) => `Send ${name} to WhatsApp`,
    shortLink: 'Short link to say out loud',
    others: 'Other countries',
    facebook: 'Facebook',
    seeAll: 'See all',
    title: (name: string) => `Is BD banned in ${name}? Visa, work and study bans for Bangladeshis`,
    tail: `Every entry links its sources. As of ${fmtDate(TODAY)}.`,
  },
  bn: {
    visa: 'ভিসা',
    tourism: 'ট্যুরিস্ট ভিসা',
    country: 'কাজ ও স্টুডেন্ট ভিসা',
    since: (d: string) => `${fmtDate(d, 'bn')} থেকে`,
    send: (name: string) => `${name}: হোয়াটসঅ্যাপে পাঠান`,
    shortLink: 'মুখে বলার মতো ছোট লিংক',
    others: 'অন্যান্য দেশ',
    facebook: 'ফেসবুক',
    seeAll: 'সব দেখুন',
    title: (name: string) => `${name}: বাংলাদেশিদের জন্য ভিসা, কাজ ও পড়াশোনার নিষেধাজ্ঞা`,
    tail: `প্রতিটি তথ্যের সাথে সূত্র আছে। তারিখ ${fmtDate(TODAY, 'bn')}।`,
  },
} satisfies Record<Lang, unknown>

/** Visa entries are named after the country, so the hub names them by what they cover instead. */
const entryName = (e: HubEntry, lang: Lang) => (e.category === 'tourism' || e.category === 'country' ? words[lang][e.category] : (lang === 'bn' && e.nameBn) || e.name)

/** "Restricted · work · since Oct 2025": status, the rows it covers when not all, and since when. */
const detail = (e: HubEntry, lang: Lang) =>
  [statusLabel[lang][e.status], e.rows.map((r) => rowLabel[lang][r]).join(', '), e.since && words[lang].since(e.since)].filter(Boolean).join(' · ')

export const Route = createFileRoute('/{-$lang}/in/$country')({
  loader: async ({ params }) => {
    const d = await getHub({ data: params.country })
    if (!d) throw notFound()
    return d
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const { hub } = loaderData
    const lang = langOf(params)
    const say = hub.text[lang]
    const names = hub.groups.flatMap((g) => g.entries).slice(0, 4).map((e) => entryName(e, lang)).join(', ')
    return seo({
      path: hub.path,
      lang,
      title: words[lang].title(hub.name[lang]),
      ogTitle: `${say.question} ${headline[lang][hub.status]}`,
      description: `${headline[lang][hub.status]} ${say.sentence} ${names}${lang === 'bn' ? '।' : '.'} ${words[lang].tail}`,
      image: ogImage('in', hub.slug),
      jsonLd: [breadcrumbs([[hub.name.en, hub.path]])],
    })
  },
  component: HubPage,
})

function HubPage() {
  const { hub, others } = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang]
  const w = words[lang]
  const name = hub.name[lang]
  const short = `${lang === 'bn' ? '/bn' : ''}/${hub.slug}`
  return (
    <div className="hb">
      <div className="tick">● {fmtDate(TODAY, lang)} · {name} · {num(hub.sources, lang)} {t.sourcesN}</div>
      <div className="entry">
        <div className="entry-main">
          <section className="pad" style={{ order: 1 }}>
            <Flag code={hub.code} className="fl hero-flag" title={name} />
            <h1 className="an hb-q">{hub.text[lang].question}</h1>
            <p className="an hb-verdict hb-stamp"><StatusIcon status={hub.status} />{headline[lang][hub.status]}</p>
            <p className="hb-sen">{hub.text[lang].sentence}</p>
          </section>
          <section className="pad" id="share" style={{ order: 3 }}>
            <HubShare hub={hub} lang={lang} path={short} />
            <p className="lab" style={{ marginTop: 10 }}>{(SITE || '').replace(/^https?:\/\//, '')}{short} · {w.shortLink}</p>
          </section>
          {others.length > 0 && (
            <section className="pad" style={{ order: 4 }}>
              <h2 className="lab">{w.others}</h2>
              <div className="chips" style={{ marginTop: 8 }}>
                {others.map((o, i) => (
                  <Link key={o.code} to="/{-$lang}/in/$country" params={{ lang: langParam(lang), country: o.slug }} className="cc" style={{ '--i': i } as React.CSSProperties}>
                    <Flag code={o.code} /> {o.name[lang]}<b>{num(o.places, lang)}</b><span className="chev" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="entry-side">
          <section className="pad" style={{ order: 2 }}>
            {hub.groups.map((g) => (
              <div key={g.group} className="hb-group">
                <h2 className="lab">{g.group === 'visa' ? w.visa : categoryLabel[lang][g.group]}</h2>
                {g.entries.length > 6 ? <Folded entries={g.entries} label={g.group === 'visa' ? w.visa : categoryLabel[lang][g.group]} lang={lang} /> : g.entries.map((e, i) => <Row key={e.href} e={e} lang={lang} i={i} />)}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

/** One entry: icon, name, what is affected, and a visible "Details →" so the row reads as a link. */
function Row({ e, lang, i }: { e: HubEntry; lang: Lang; i: number }) {
  return (
    <Link to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: e.href.split('/')[1]!, id: e.id }} className="hb-row" style={{ '--i': i } as React.CSSProperties}>
      <StatusIcon status={e.status} />
      <span className="hb-t"><b className="nm">{entryName(e, lang)}</b><span>{detail(e, lang)}</span></span>
      <span className="more">{dict[lang].details}<span className="chev" aria-hidden="true">→</span></span>
    </Link>
  )
}

/** More than six entries in one category: a count row that opens the full list (native <details>). */
function Folded({ entries, label, lang }: { entries: HubEntry[]; label: string; lang: Lang }) {
  const order: Status[] = ['shut', 'disputed', 'restricted', 'unclear', 'reopened']
  const counts = order.map((s) => [s, entries.filter((e) => e.status === s).length] as const).filter(([, n]) => n)
  return (
    <details className="hb-fold">
      <summary className="hb-row">
        <StatusIcon status={entries[0]!.status} />
        <span className="hb-t">
          <b className="nm">{num(entries.length, lang)}{lang === 'bn' ? 'টি' : ''} {label.toLowerCase()}</b>
          <span>{counts.map(([s, n]) => `${num(n, lang)} ${statusLabel[lang][s].toLowerCase()}`).join(' · ')}</span>
        </span>
        <span className="more">{words[lang].seeAll}<span className="chev" aria-hidden="true">▾</span></span>
      </summary>
      {entries.map((e, i) => <Row key={e.href} e={e} lang={lang} i={i} />)}
    </details>
  )
}

/**
 * The big WhatsApp button, the other channels, and on phones a sticky bar with the four that matter most.
 * Every channel gets the same caption: the Bangla line, the English line, then the tracked short link.
 */
function HubShare({ hub, lang, path }: { hub: Hub; lang: Lang; path: string }) {
  const { toast, say } = useToast()
  const s = shareText[lang]
  const text = `${hub.text.bn.line}\n${hub.text.en.line}`
  // Read at tap time only, so the prerendered HTML doesn't depend on where it is served.
  const url = `${SITE || (typeof location === 'undefined' ? '' : location.origin)}${path}`
  const send = useSend({ lang, text, url, card: `hub-${hub.slug}`, format: 'link', say })
  const label = (ch: Channel) => (ch === 'facebook' ? words[lang].facebook : s.channels[ch])
  const button = (ch: Channel, big?: string) => (
    <button key={ch} type="button" className={`hb-ch ch-${ch}${big ? ' big' : ''}`} onClick={() => void send(ch)}>
      <Icon name={ch} size={big ? 22 : 18} />
      <span>{big ?? label(ch)}</span>
    </button>
  )
  // The phone's own share sheet where there is one, else the link goes on the clipboard.
  const more = () => (navigator.share ? navigator.share({ text, url }).catch(() => {}) : send('copy'))
  return (
    <>
      <div className="hb-chans">
        {button('whatsapp', words[lang].send(hub.name[lang]))}
        {(['messenger', 'facebook', 'x', 'telegram', 'copy'] as const).map((ch) => button(ch))}
      </div>
      <div className="hb-bar" role="group" aria-label={s.shareThis}>
        {(['whatsapp', 'facebook', 'messenger'] as const).map((ch) => button(ch))}
        <button type="button" className="hb-ch ch-more" onClick={() => void more()}><Icon name="share" /><span>{s.more}</span></button>
      </div>
      {toast}
    </>
  )
}
