import { Link, createFileRoute } from '@tanstack/react-router'
import { getAbout } from '../../data/api.ts'
import { StatusTag } from '../../components/ui.tsx'
import { dict, fmtDate, headline, type Lang } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'
import type { Status } from '../../data/derive.ts'

export const Route = createFileRoute('/{-$lang}/about')({
  loader: () => getAbout(),
  head: () => ({ meta: [{ title: 'How this works · Is BD banned here?' }] }),
  component: About,
})

const meaning: Record<Status, string> = {
  shut: 'Stopped or never offered to Bangladeshis, with a source.',
  restricted: 'Open, with conditions only Bangladeshis face: caps, deposits, extra checks, some intakes only.',
  unclear: 'A ban whose announced end date passed with no update, or with no new source or check in 180 days.',
  disputed: 'A report says one thing, the institution or a government says another. Both are shown.',
  reopened: 'A source says it is open to Bangladeshis again.',
  none: 'Nobody has sent a receipt. Not a guarantee.',
}

function About() {
  const d = Route.useLoaderData()
  const lang: Lang = useLang()
  const t = dict[lang]
  return (
    <section className="pad">
      <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{t.about}</h1>
      <div className="panel pn" style={{ margin: '14px 0' }}>
        {(Object.keys(meaning) as Status[]).map((s) => (
          <div key={s} className="blk">
            <div className="row" style={{ border: 0, padding: 0 }}><span className="an" style={{ fontSize: 20 }}>{headline.en[s]}</span><StatusTag status={s} lang={lang} /></div>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{meaning[s]}</p>
          </div>
        ))}
      </div>
      <h2 className="an" style={{ fontSize: 26, marginTop: 20 }}>Rules</h2>
      <ol className="body" style={{ paddingLeft: 20 }}>
        <li>No source, no status change. Every entry links to what it's based on.</li>
        <li>Status is computed from the history of events, never typed by hand.</li>
        <li>An end date passing makes a ban Unclear, not Reopened.</li>
        <li>Official sources beat press reports, which beat community reports.</li>
        <li>Every share card carries its "as of" date and its source.</li>
        <li>We only record restrictions on Bangladeshis specifically, not normal visa or entry requirements.</li>
      </ol>
      <h2 id="receipts" className="an" style={{ fontSize: 26, marginTop: 20 }}>Send a receipt</h2>
      <p className="body">Paste a news link, an official page or a refusal email (with personal details removed). Submissions with accounts and a review queue are coming next; until then, use the link on any page.</p>
      <h2 id="reply" className="an" style={{ fontSize: 26, marginTop: 20 }}>Right of reply</h2>
      <p className="body">Universities, companies, embassies and governments can respond on the record. Replies are published on the entry with the date, and change the status when they come with a source.</p>
      <h2 id="corrections" className="an" style={{ fontSize: 26, marginTop: 20 }}>{t.corrections}</h2>
      {d.corrections.length === 0 && <p className="body">None yet.</p>}
      {d.corrections.map((c, i) => (
        <Link key={i} to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: c.item.href.split('/')[1]!, id: c.item.id }} className="blk" style={{ display: 'block' }}>
          <p className="lab">{fmtDate(c.date, lang)} · {c.item.name}</p>
          <p className="body">{c.summary}</p>
        </Link>
      ))}
      <h2 className="an" style={{ fontSize: 26, marginTop: 20 }}>Credits</h2>
      <p className="body" style={{ fontWeight: 500 }}>
        Flags: country-flag-icons (MIT). Fonts: Anton, Permanent Marker, Noto Sans Bengali (SIL OFL). Place photos from Wikimedia Commons, credited on each image.
        {d.visaFree ? ` Visa access list: "${d.visaFree.title}", Wikipedia, ${d.visaFree.license}, retrieved ${d.visaFree.retrieved}.` : ''} Data: CC BY 4.0.
      </p>
    </section>
  )
}
