import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Logo } from '../../components/ui.tsx'
import { dict } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}')({
  // Only "bn" (or nothing) is a language; anything else falls through to other routes.
  params: { parse: (p: { lang?: string }) => (p.lang === undefined || p.lang === 'bn' ? p : false) },
  component: Layout,
})

function toggleTheme() {
  const night = document.documentElement.dataset.theme !== 'night'
  if (night) document.documentElement.dataset.theme = 'night'
  else delete document.documentElement.dataset.theme
  localStorage.setItem('isbd:theme', night ? 'night' : 'red')
  track('theme_switch', { theme: night ? 'night' : 'red' })
}

function Layout() {
  const lang = useLang()
  const t = dict[lang]
  const path = useRouterState({ select: (s) => s.location.pathname })
  const other = lang === 'bn' ? path.replace(/^\/bn/, '') || '/' : `/bn${path === '/' ? '' : path}`

  // Count visits that came from a shared card (?s=card&f=format).
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('s')) track('share_visit', { card: q.get('s'), format: q.get('f') })
  }, [])

  return (
    <div className="pg" style={{ minHeight: '100vh' }}>
      <header className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px' }}>
        <Link to="/{-$lang}" params={{ lang: langParam(lang) }} aria-label="Home">
          <Logo text={t.brand} />
        </Link>
        <nav style={{ display: 'flex', gap: 14, alignItems: 'center' }} className="lab">
          <Link to="/{-$lang}/list" params={{ lang: langParam(lang) }}>{t.myList}</Link>
          <a href={other} onClick={() => track('lang_switch', { to: lang === 'bn' ? 'en' : 'bn' })}>{lang === 'bn' ? 'English' : 'বাংলা'}</a>
          <button onClick={toggleTheme} className="lab" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} aria-label="Switch red and night theme">◐</button>
        </nav>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="wrap pad" style={{ paddingBottom: 40 }}>
        <p className="mk hot" style={{ fontSize: 18, transform: 'rotate(-2deg)', margin: '20px 0 8px' }}>apply korar age check koro</p>
        <p className="lab">
          <Link to="/{-$lang}/about" params={{ lang: langParam(lang) }}>{t.about}</Link> · <Link to="/{-$lang}/about" hash="corrections" params={{ lang: langParam(lang) }}>{t.corrections}</Link> · #isBDbannedhere
        </p>
      </footer>
    </div>
  )
}
