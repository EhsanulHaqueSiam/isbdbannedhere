import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getVerdicts, type CountryVerdicts } from '../../data/tools-api.ts'
import { purposes, type Purpose } from '../../data/tools.ts'
import { TODAY } from '../../data/today.ts'
import { CardFrame, CardIcon, FRAME_INNER, mono, ORIGIN, sans } from '../../components/Card.tsx'
import { ToolShare } from '../../components/ShareKit.tsx'
import { StatusTag } from '../../components/ui.tsx'
import { fitSize, purposeLabel, purposeTitle, theName, toolName, verdictWords } from '../../lib/captions.ts'
import { fmtDate, statusLabel, type Lang } from '../../lib/i18n.ts'
import { langOf, useLang } from '../../lib/lang.ts'
import { hubPath } from '../../lib/places.ts'
import { ogImage, seo } from '../../lib/site.ts'

export const Route = createFileRoute('/{-$lang}/check')({
  loader: () => getVerdicts(),
  head: ({ params }) => {
    const lang = langOf(params)
    return seo({
      path: '/check',
      lang,
      title: lang === 'bn' ? 'আমি কি আটকে যাব? পড়াশোনা, কাজ বা ভ্রমণের দেশ যাচাই করুন | Is BD banned here?' : 'Am I affected? Check a country for study, work or travel | Is BD banned here?',
      description: lang === 'bn' ? 'দেশ আর উদ্দেশ্য বেছে নিন: কতগুলো বিশ্ববিদ্যালয়, ভিসা আর শহর বাংলাদেশিদের জন্য বন্ধ বা সীমিত, সূত্রসহ।' : 'Pick a country and why you are going: how many universities, visas and cities shut out or restrict Bangladeshis, with sources.',
      image: ogImage('check'),
    })
  },
  component: Check,
})

const words = {
  en: { intro: 'Pick where you are going and why. The answer comes from the same dated sources as every entry.', to: 'Going to', for: 'For', all: (n: string) => `Everything in ${n}`, worst: 'Worst first', checkYours: 'Check yours' },
  bn: { intro: 'কোথায় যাচ্ছেন আর কেন, বেছে নিন। উত্তর আসে প্রতিটি এন্ট্রির মতো একই তারিখসহ সূত্র থেকে।', to: 'যাচ্ছি', for: 'উদ্দেশ্য', all: (n: string) => `${n}: সব দেখুন`, worst: 'সবচেয়ে খারাপ আগে', checkYours: 'আপনারটাও দেখুন' },
}

const prefix = (lang: Lang) => (lang === 'bn' ? '/bn' : '')

function Check() {
  const countries = Route.useLoaderData()
  const lang = useLang()
  const w = words[lang]
  const [code, setCode] = useState(countries[0]?.code ?? 'GB')
  const [purpose, setPurpose] = useState<Purpose>('study')
  // A shared /check?c=AE&p=visit link opens that answer. Read after mount: the page itself is prerendered.
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const c = q.get('c')?.toUpperCase()
    const p = q.get('p') as Purpose | null
    if (c && countries.some((x) => x.code === c)) setCode(c)
    if (p && purposes.includes(p)) setPurpose(p)
  }, [countries])
  function choose(c: string, p: Purpose) {
    setCode(c)
    setPurpose(p)
    history.replaceState(history.state, '', `?c=${c}&p=${p}`)
  }
  const c = countries.find((x) => x.code === code) ?? countries[0]
  if (!c) return null
  const v = c.verdicts[purpose]
  const vw = { bn: verdictWords(v, 'bn'), en: verdictWords(v, 'en') }
  const path = `/check?c=${c.code}&p=${purpose}`
  const hub = `${prefix(lang)}${hubPath(c.code)}`
  const text = {
    bn: `${purposeTitle(purpose, c.code, c.name.bn, 'bn')}: ${vw.bn.big} ${vw.bn.sub}\nআপনারটাও দেখুন 👇`,
    en: `${purposeTitle(purpose, c.code, c.name.en, 'en')}: ${vw.en.big} ${vw.en.sub}\nCheck yours 👇`,
  }

  return (
    <section className="pad split">
      <div>
        <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{toolName[lang].check}</h1>
        <p className="body" style={{ marginTop: 8 }}>{w.intro}</p>
        <label className="lab" htmlFor="to" style={{ display: 'block', margin: '18px 0 6px' }}>{w.to}</label>
        <select id="to" className="input" value={c.code} onChange={(e) => choose(e.target.value, purpose)}>
          {countries.map((x) => <option key={x.code} value={x.code}>{x.name[lang]}</option>)}
        </select>
        <p className="lab" style={{ margin: '16px 0 6px' }}>{w.for}</p>
        <div className="chips" role="group" aria-label={w.for}>
          {purposes.map((p) => (
            <button key={p} type="button" className={`chip${p === purpose ? ' on' : ''}`} style={{ margin: 0, fontSize: 15, padding: '12px 16px' }} aria-pressed={p === purpose} onClick={() => choose(c.code, p)}>{purposeLabel[lang][p]}</button>
          ))}
        </div>
        <div className="panel pn" style={{ margin: '18px 0 0' }} aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CardIcon status={v.worst} size={36} />
            <p className="ttl" style={{ margin: 0, fontSize: 21 }}>{vw[lang].big}</p>
          </div>
          <p className="body" style={{ marginTop: 6 }}>{vw[lang].sub}</p>
          {v.top.length > 0 && <p className="lab" style={{ margin: '12px 0 2px' }}>{w.worst}</p>}
          {v.top.map((t) => (
            <a key={t.href} href={`${prefix(lang)}${t.href}`} className="row">
              <span style={{ fontWeight: 700 }}>{lang === 'bn' && t.nameBn ? t.nameBn : t.name}</span>
              <StatusTag status={t.status} lang={lang} />
            </a>
          ))}
          <a className="btn out" href={hub}>{w.all(lang === 'en' ? theName(c.code, c.name.en) : c.name.bn)} →</a>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <ToolShare
          key={`${c.code}-${purpose}`}
          lang={lang}
          id="check"
          file={`isbd-check-${c.code.toLowerCase()}-${purpose}.png`}
          url={`${ORIGIN}${prefix(lang)}${path}`}
          text={text}
          card={<CheckCard c={c} purpose={purpose} lang={lang} url={`${ORIGIN}${prefix(lang)}${path}`} checkYours={w.checkYours} />}
        />
        <p className="lab" style={{ marginTop: 12, textAlign: 'center' }}><Link to="/{-$lang}/compare" params={{ lang: lang === 'bn' ? 'bn' : undefined }}>{toolName[lang].compare} →</Link></p>
      </div>
    </section>
  )
}

/** "Study in the UK / 20 universities shut you out." as a post-size card. */
function CheckCard({ c, purpose, lang, url, checkYours }: { c: CountryVerdicts; purpose: Purpose; lang: Lang; url: string; checkYours: string }) {
  const v = c.verdicts[purpose]
  const vw = verdictWords(v, lang)
  const title = purposeTitle(purpose, c.code, c.name[lang], lang)
  return (
    <CardFrame url={url} lang={lang} green={v.worst === 'reopened'}>
      <p style={{ ...mono(30), display: 'flex', alignItems: 'center', gap: 16 }}>
        <CardIcon status={v.worst} size={48} />
        {title} · {lang === 'bn' ? fmtDate(TODAY, 'bn') : `as of ${fmtDate(TODAY)}`}
      </p>
      <p className="an" style={{ fontSize: fitSize(vw.big, FRAME_INNER, 170, { lines: 3, min: 80 }), lineHeight: lang === 'bn' ? 1.15 : 0.92 }}>{vw.big}</p>
      <p style={sans(fitSize(vw.sub, FRAME_INNER, 54, { lines: 2, face: 'sans', min: 32 }), 1.2)}>{vw.sub}</p>
      {v.top.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {v.top.map((t) => {
            const line = `${lang === 'bn' && t.nameBn ? t.nameBn : t.name} · ${statusLabel[lang][t.status]}`
            return <p key={t.href} style={sans(fitSize(line, FRAME_INNER, 40, { face: 'sans', min: 28 }), 1.2)}>{line}</p>
          })}
        </div>
      )}
      <p className="mk" style={{ fontSize: 46, color: '#fff', margin: 0, transform: 'rotate(-2deg)' }}>{checkYours} →</p>
    </CardFrame>
  )
}
