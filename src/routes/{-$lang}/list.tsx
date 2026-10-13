import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { getMany } from '../../data/api.ts'
import type { Item } from '../../data/index.ts'
import { ListCard } from '../../components/Card.tsx'
import { SearchBox } from '../../components/Search.tsx'
import { Preview } from '../../components/ShareSheet.tsx'
import { Flag, StatusTag } from '../../components/ui.tsx'
import { dict } from '../../lib/i18n.ts'
import { langOf, langParam, useLang } from '../../lib/lang.ts'
import { seo } from '../../lib/site.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}/list')({
  head: ({ params }) => seo({ path: '/list', lang: langOf(params), title: 'Check my list: universities, visas and companies | Is BD banned here?', description: 'Add the universities, countries and companies you plan to apply to or visit and see which ones shut out Bangladeshis. Stays on your phone.' }),
  component: MyList,
})

const KEY = 'isbd:list'
const bad = (i: Item) => ['shut', 'disputed', 'unclear', 'restricted'].includes(i.state.status)

/** The shortlist lives in this browser only. Nothing is sent anywhere. */
function MyList() {
  const lang = useLang()
  const t = dict[lang]
  const [keys, setKeys] = useState<string[]>([])
  const [list, setList] = useState<Item[]>([])
  const [card, setCard] = useState(false)
  const full = useRef<HTMLDivElement>(null)

  useEffect(() => setKeys(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]), [])
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(keys))
    if (keys.length) void getMany({ data: keys }).then(setList)
    else setList([])
  }, [keys])

  const n = list.filter(bad).length

  async function share() {
    if (!full.current) return
    const blob = await toBlob(full.current, { width: 1080, height: 1920, pixelRatio: 1 })
    if (!blob) return
    const file = new File([blob], 'my-list.png', { type: 'image/png' })
    track('shortlist_card', { size: list.length, notSafe: n })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `I checked my list: ${t.notSafe(n, list.length)}. Check yours: ${location.origin} #isBDbannedhere` }).catch(() => {})
    else Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'my-list.png' }).click()
  }

  return (
    <section className="pad narrow">
      <h1 className="an" style={{ fontSize: 'clamp(44px, 13vw, 84px)', lineHeight: 0.95 }}>{t.myListTitle}</h1>
      <p className="body" style={{ marginTop: 8 }}>{t.myListHint}</p>
      <div style={{ marginTop: 14 }}>
        <SearchBox lang={lang} onPick={(e) => { const k = `${e.category}/${e.id}`; if (!keys.includes(k)) { setKeys([...keys, k]); track('shortlist_add', { item: k }) } }} />
      </div>
      <div style={{ marginTop: 14 }}>
        {list.map((i) => (
          <div key={i.href} className="row">
            <Link to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: i.href.split('/')[1]!, id: i.id }} className="an" style={{ fontSize: 24 }}>
              <span className={i.state.status === 'shut' ? 'strike' : ''}><Flag code={i.country} /> {lang === 'bn' && i.nameBn ? i.nameBn : i.name}</span>
            </Link>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusTag status={i.state.status} lang={lang} />
              <button className="lab" style={{ background: 'none', border: 0, cursor: 'pointer' }} aria-label={`${t.remove} ${i.name}`} onClick={() => setKeys(keys.filter((k) => k !== `${i.category}/${i.id}`))}>✕</button>
            </span>
          </div>
        ))}
      </div>
      {list.length > 0 && (
        <>
          <p className="mk hot" style={{ fontSize: 26, margin: '16px 0 0', transform: 'rotate(-2deg)' }}>{t.notSafe(n, list.length)}</p>
          <button className="btn" onClick={() => setCard(true)}>{t.makeCard}</button>
        </>
      )}
      {card && (
        <div className="pn" style={{ marginTop: 16, padding: 16, display: 'grid', justifyItems: 'center', gap: 10 }}>
          <Preview format="story" width={220}><ListCard list={list} /></Preview>
          <button className="btn" onClick={share}>↗ {t.shareNow}</button>
          <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true"><div ref={full}><ListCard list={list} /></div></div>
        </div>
      )}
    </section>
  )
}
