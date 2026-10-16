import { Link, createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { TODAY } from '../../data/today.ts'
import { Bar, Legend, Ribbon, Waffle, WorldMap } from '../../components/Viz.tsx'
import { Flag, StatusIcon } from '../../components/ui.tsx'
import { categoryLabel, dict, fmtDate, monthName, statusLabel, type Lang } from '../../lib/i18n.ts'
import { num } from '../../lib/captions.ts'
import type { Status } from '../../data/derive.ts'
import { countrySlug } from '../../lib/places.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { seo } from '../../lib/site.ts'

// The whole picture: the map, every country with a count, the waffle, the month ribbon and the category bars.
// This was the home page until 16 Oct 2026; visitors said it was too much to land on.
export const Route = createFileRoute('/{-$lang}/world')({
  loader: () => getHome(),
  head: ({ params, loaderData }) => {
    const lang = langOf(params)
    const n = loaderData?.countries.length ?? 0
    return seo({
      path: '/world',
      lang,
      title: lang === 'bn' ? `${num(n, 'bn')}টি দেশ বাংলাদেশিদের জন্য বন্ধ বা সীমিত` : `${n} countries that ban or restrict Bangladeshis`,
      ogTitle: lang === 'bn' ? 'যেখানে বাংলাদেশিরা এখন নিষিদ্ধ।' : 'Where Bangladeshis are banned right now.',
      description: `The map and the numbers: which countries shut out or restrict Bangladeshis, how many places each, and new bans by month. As of ${fmtDate(TODAY)}.`,
    })
  },
  component: Countries,
})

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
  },
} satisfies Record<Lang, unknown>

const closedStatuses: Status[] = ['shut', 'disputed', 'restricted', 'unclear']

function Countries() {
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

      <div className="dgrid">
        <section className="pad">
          <h2 className="an" style={{ fontSize: 'clamp(24px, 6.8vw, 32px)' }}>{w.closed(closed, d.tracked)}</h2>
          <Waffle counts={d.tally} label={w.waffle} />
          <Legend items={legend} />
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
    </>
  )
}
