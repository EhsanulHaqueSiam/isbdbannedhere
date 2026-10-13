import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getVerdicts, type CountryVerdicts } from '../../data/tools-api.ts'
import { purposes } from '../../data/tools.ts'
import { TODAY } from '../../data/today.ts'
import { CardFrame, CardIcon, FRAME_INNER, mono, ORIGIN, sans } from '../../components/Card.tsx'
import { ToolShare } from '../../components/ShareKit.tsx'
import { Flag, StatusTag } from '../../components/ui.tsx'
import { fitSize, purposeLabel, toolName, verdictWords } from '../../lib/captions.ts'
import { fmtDate, type Lang } from '../../lib/i18n.ts'
import { langOf, useLang } from '../../lib/lang.ts'
import { ogImage, seo } from '../../lib/site.ts'

export const Route = createFileRoute('/{-$lang}/compare')({
  loader: () => getVerdicts(),
  head: ({ params }) => {
    const lang = langOf(params)
    return seo({
      path: '/compare',
      lang,
      title: lang === 'bn' ? 'দেশ মিলিয়ে দেখুন: পড়াশোনা, কাজ, ভ্রমণে বাংলাদেশিদের জন্য কোথায় বন্ধ | Is BD banned here?' : 'Compare countries: where Bangladeshis can study, work and visit | Is BD banned here?',
      description: lang === 'bn' ? '২-৩টি দেশ পাশাপাশি: পড়াশোনা, কাজ আর ভ্রমণে কোথায় বন্ধ, কোথায় সীমিত, সূত্রসহ।' : 'Two or three countries side by side: where study, work and travel are shut or restricted for Bangladeshis, with sources.',
      image: ogImage('compare'),
    })
  },
  component: Compare,
})

const words = {
  en: { intro: 'For choosing where to apply: pick two or three countries.', pick: (n: number) => `Country ${n}`, none: 'None', vs: 'vs' },
  bn: { intro: 'কোথায় আবেদন করবেন ঠিক করতে: দুই বা তিনটি দেশ বেছে নিন।', pick: (n: number) => `দেশ ${n}`, none: 'কোনোটি না', vs: 'বনাম' },
}
const prefix = (lang: Lang) => (lang === 'bn' ? '/bn' : '')

function Compare() {
  const countries = Route.useLoaderData()
  const lang = useLang()
  const w = words[lang]
  const has = (c: string) => countries.some((x) => x.code === c)
  // UK, Australia, Canada: the three most asked about for study.
  const [picks, setPicks] = useState<string[]>(['GB', 'AU', 'CA'].filter(has))
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('c')?.toUpperCase().split(',').filter(has).slice(0, 3)
    if (q && q.length >= 2) setPicks(q)
  }, [])
  function set(i: number, code: string) {
    const next = [...picks]
    if (code) next[i] = code
    else next.splice(i, 1)
    const clean = [...new Set(next)].slice(0, 3)
    setPicks(clean)
    history.replaceState(history.state, '', `?c=${clean.join(',')}`)
  }
  const chosen = picks.map((c) => countries.find((x) => x.code === c)).filter((x): x is CountryVerdicts => !!x)
  const path = `/compare?c=${picks.join(',')}`
  const summary = (l: Lang) => chosen.map((c) => `${c.name[l]}: ${purposes.map((p) => `${purposeLabel[l][p]} ${verdictWords(c.verdicts[p], l).cell}`).join(', ')}`).join('\n')

  return (
    <section className="pad split">
      <div>
        <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{toolName[lang].compare}</h1>
        <p className="body" style={{ marginTop: 8 }}>{w.intro}</p>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <label className="lab" htmlFor={`c${i}`} style={{ display: 'block', margin: '14px 0 6px' }}>{w.pick(i + 1)}</label>
            <select id={`c${i}`} className="input" value={picks[i] ?? ''} onChange={(e) => set(i, e.target.value)} disabled={i > picks.length}>
              {i >= 2 && <option value="">{w.none}</option>}
              {countries.map((x) => <option key={x.code} value={x.code} disabled={picks.includes(x.code) && picks[i] !== x.code}>{x.name[lang]}</option>)}
            </select>
          </div>
        ))}
        <div className="panel pn" style={{ margin: '18px 0 0' }}>
          {chosen.map((c) => (
            <div key={c.code} className="blk">
              <p className="an" style={{ fontSize: 22 }}><Flag code={c.code} /> {c.name[lang]}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 6 }}>
                {purposes.map((p) => (
                  <div key={p}>
                    <p className="lab">{purposeLabel[lang][p]}</p>
                    <StatusTag status={c.verdicts[p].worst} lang={lang} text={verdictWords(c.verdicts[p], lang).cell} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        {chosen.length >= 2 && (
          <ToolShare
            key={picks.join()}
            lang={lang}
            id="compare"
            file={`isbd-compare-${picks.join('-').toLowerCase()}.png`}
            url={`${ORIGIN}${prefix(lang)}${path}`}
            text={{ bn: `${chosen.map((c) => c.name.bn).join(` ${words.bn.vs} `)}\n${summary('bn')}`, en: `${chosen.map((c) => c.name.en).join(` ${words.en.vs} `)}\n${summary('en')}` }}
            card={<CompareCard chosen={chosen} lang={lang} url={`${ORIGIN}${prefix(lang)}${path}`} />}
          />
        )}
      </div>
    </section>
  )
}

const COL = (FRAME_INNER - 2 * 24) / 3

/** Two or three countries, each with its study, work and visit verdicts. */
function CompareCard({ chosen, lang, url }: { chosen: CountryVerdicts[]; lang: Lang; url: string }) {
  const title = chosen.map((c) => c.name[lang]).join(` ${words[lang].vs} `)
  return (
    <CardFrame url={url} lang={lang}>
      <p style={mono(30)}>{toolName[lang].compare} · {lang === 'bn' ? fmtDate(TODAY, 'bn') : `as of ${fmtDate(TODAY)}`}</p>
      <p className="an" style={{ fontSize: fitSize(title, FRAME_INNER, 96, { lines: 2, min: 56 }), lineHeight: lang === 'bn' ? 1.2 : 0.95 }}>{title}</p>
      {chosen.map((c) => (
        <div key={c.code} style={{ display: 'grid', gap: 12, paddingTop: 22, borderTop: '3px solid rgba(255,255,255,.45)' }}>
          <p className="an" style={{ fontSize: fitSize(c.name[lang], FRAME_INNER - 60, 64, { min: 40 }), display: 'flex', alignItems: 'center', gap: 16, lineHeight: 1.1 }}>
            <Flag code={c.code} className="fl" /> {c.name[lang]}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${COL}px)`, gap: 24 }}>
            {purposes.map((p) => {
              const v = c.verdicts[p]
              const cell = verdictWords(v, lang).cell
              return (
                <div key={p}>
                  <p style={mono(26)}>{purposeLabel[lang][p]}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <CardIcon status={v.worst} size={44} />
                    <p style={sans(fitSize(cell, COL - 54, 34, { lines: 2, face: 'sans', min: 24 }), 1.12)}>{cell}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </CardFrame>
  )
}
