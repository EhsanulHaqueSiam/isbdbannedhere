import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Logo } from '../../components/ui.tsx'
import { dict, type Lang } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'
import { toolName, tools } from '../../lib/captions.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}')({
  // Only "bn" (or nothing) is a language; anything else falls through to other routes.
  params: { parse: (p: { lang?: string }) => (p.lang === undefined || p.lang === 'bn' ? p : false) },
  component: Layout,
})

const themeWords = { en: { group: 'Theme', red: 'Red', night: 'Night' }, bn: { group: 'থিম', red: 'লাল', night: 'রাত' } }

/** Red / Night switch. The root's inline script applies the saved theme before paint; this reads it after mount. */
function ThemeSwitch({ lang }: { lang: Lang }) {
  const w = themeWords[lang]
  const [night, setNight] = useState(false)
  useEffect(() => setNight(document.documentElement.dataset.theme === 'night'), [])
  function pick(n: boolean) {
    if (n === night) return
    if (n) document.documentElement.dataset.theme = 'night'
    else delete document.documentElement.dataset.theme
    localStorage.setItem('isbd:theme', n ? 'night' : 'red')
    setNight(n)
    track('theme_switch', { theme: n ? 'night' : 'red' })
  }
  return (
    <div className="seg" role="group" aria-label={w.group}>
      <button type="button" aria-pressed={!night} onClick={() => pick(false)}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#a3000f" stroke="#fff" strokeWidth="1.5" /></svg>{w.red}
      </button>
      <button type="button" aria-pressed={night} onClick={() => pick(true)}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M8.5 1.2A5 5 0 1 0 10.8 9 4 4 0 0 1 8.5 1.2z" fill="currentColor" /></svg>{w.night}
      </button>
    </div>
  )
}

function Layout() {
  const lang = useLang()
  const t = dict[lang]
  const L = langParam(lang)
  const path = useRouterState({ select: (s) => s.location.pathname })
  const other = lang === 'bn' ? path.replace(/^\/bn/, '') || '/' : `/bn${path === '/' ? '' : path}`

  // Count visits that came from a shared card (?s=card&f=format).
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('s')) track('share_visit', { card: q.get('s'), format: q.get('f') })
  }, [])

  return (
    <div className="pg" style={{ minHeight: '100vh' }}>
      {/* Phones: logo on the first line, nav on the second; one line from tablet up. */}
      <header className="wrap hdr">
        <Link to="/{-$lang}" params={{ lang: L }} aria-label="Home">
          <Logo text={t.brand} />
        </Link>
        <nav className="lab hdr-nav">
          <Link to="/{-$lang}/check" params={{ lang: L }}>{toolName[lang].nav}</Link>
          <Link to="/{-$lang}/list" params={{ lang: L }}>{t.myList}</Link>
          <a href={other} lang={lang === 'bn' ? 'en' : 'bn'} onClick={() => track('lang_switch', { to: lang === 'bn' ? 'en' : 'bn' })}>{lang === 'bn' ? 'English' : 'বাংলা'}</a>
          <ThemeSwitch lang={lang} />
        </nav>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="wrap pad" style={{ paddingBottom: 40 }}>
        <p className="mk hot" style={{ fontSize: 18, transform: 'rotate(-2deg)', margin: '20px 0 14px' }}>apply korar age check koro</p>
        <p className="lab foot-links">
          {tools.map((k) => (
            <Link key={k} to={`/{-$lang}/${k}`} params={{ lang: L }}>{toolName[lang][k]}</Link>
          ))}
        </p>
        <p className="lab foot-links" style={{ marginTop: 8 }}>
          <Link to="/{-$lang}/about" params={{ lang: L }}>{t.about}</Link>
          <Link to="/{-$lang}/about" hash="corrections" params={{ lang: L }}>{t.corrections}</Link>
          <Link to="/{-$lang}/receipts" params={{ lang: L }}>{t.receipts}</Link>
          <span>#isBDbannedhere</span>
        </p>
      </footer>
    </div>
  )
}
