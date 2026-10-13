import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { getSearchIndex } from '../data/api.ts'
import { categoryLabel, dict, type Lang } from '../lib/i18n.ts'
import { langParam } from '../lib/lang.ts'
import { search } from '../lib/search.ts'
import { track } from '../lib/track.ts'
import { Flag, StatusTag } from './ui.tsx'

type Entry = Awaited<ReturnType<typeof getSearchIndex>>[number]

/** Search box. Loads the compact index the first time it's used. With onPick it adds instead of navigating. */
export function SearchBox({ lang, onPick, autoFocus }: { lang: Lang; onPick?: (e: Entry) => void; autoFocus?: boolean }) {
  const t = dict[lang]
  const [q, setQ] = useState('')
  const index = useRef<Entry[] | null>(null)
  const [ready, setReady] = useState(false)
  const load = async () => {
    if (index.current) return
    index.current = await getSearchIndex()
    setReady(true)
  }
  const results = ready && index.current ? search(index.current, q) : []

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        type="search"
        value={q}
        autoFocus={autoFocus}
        placeholder={t.search}
        aria-label={t.search}
        onFocus={load}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => q && track(results.length ? 'search' : 'search_no_result', { q })}
      />
      {q && ready && (
        <div className="pn" style={{ boxShadow: 'inset 0 0 0 2px currentColor', borderTop: 0, padding: '0 14px' }}>
          {results.length === 0 && <p className="lab" style={{ padding: '12px 0' }}>{t.searchEmpty}</p>}
          {results.map((r) =>
            onPick ? (
              <button key={r.href} className="row" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--ch)', color: 'inherit', cursor: 'pointer', textAlign: 'left', font: 'inherit' }} onClick={() => { onPick(r); setQ('') }}>
                <span style={{ fontWeight: 700 }}><Flag code={r.country} /> {lang === 'bn' && r.nameBn ? r.nameBn : r.name}<span className="lab" style={{ display: 'block', marginTop: 2 }}>{categoryLabel[lang][r.category]}{r.city ? ` · ${r.city}` : ''}</span></span>
                <StatusTag status={r.status} lang={lang} />
              </button>
            ) : (
              <Link key={r.href} to="/{-$lang}/$category/$id" params={{ lang: langParam(lang), category: r.href.split('/')[1]!, id: r.id }} className="row">
                <span style={{ fontWeight: 700 }}><Flag code={r.country} /> {lang === 'bn' && r.nameBn ? r.nameBn : r.name}<span className="lab" style={{ display: 'block', marginTop: 2 }}>{categoryLabel[lang][r.category]}{r.city ? ` · ${r.city}` : ''}</span></span>
                <StatusTag status={r.status} lang={lang} />
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  )
}
