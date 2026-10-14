import { createRouter } from '@tanstack/react-router'
import { createElement } from 'react'
import { routeTree } from './routeTree.gen'
import { track } from './lib/track.ts'
import { consent, loadPixels } from './lib/pixels.ts'

export function getRouter() {
  const router = createRouter({ routeTree, scrollRestoration: true, defaultPreload: 'intent', defaultErrorComponent: ErrorPage, defaultNotFoundComponent: NotFound })
  // One $pageview per page the reader actually sees, including client-side navigations.
  if (typeof window !== 'undefined' && consent() === 'yes') loadPixels()
  if (typeof window !== 'undefined') router.subscribe('onResolved', ({ toLocation, fromLocation }) => toLocation.href !== fromLocation?.href && track('$pageview'))
  return router
}

// A deploy renames every chunk, so a page opened before it fails to load the next route's code. That is a stale
// page, not a bug: reload it once from the server. Anything else shows a page with a way out.
const stale = (e: unknown) => /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(String((e as Error)?.message ?? e))

function ErrorPage({ error }: { error: unknown }) {
  if (typeof window !== 'undefined' && stale(error) && !sessionStorage.getItem('isbd:reloaded')) {
    sessionStorage.setItem('isbd:reloaded', '1')
    location.reload()
    return null
  }
  if (typeof window !== 'undefined') sessionStorage.removeItem('isbd:reloaded')
  const bn = typeof location !== 'undefined' && /^\/bn(\/|$)/.test(location.pathname)
  return createElement(
    'section',
    { className: 'pad narrow' },
    createElement('p', { className: 'an', style: { fontSize: 'clamp(40px, 11vw, 72px)' } }, bn ? 'কিছু একটা ভুল হয়েছে।' : 'Something broke.'),
    createElement('p', { className: 'body', style: { marginTop: 10 } }, bn ? 'পেজটি আবার লোড করুন। সমস্যা থাকলে হোমে ফিরে যান।' : 'Reload the page. If it keeps happening, go back to the home page.'),
    createElement('a', { className: 'btn', href: typeof location === 'undefined' ? '/' : location.pathname }, bn ? 'আবার লোড' : 'Reload'),
    createElement('a', { className: 'btn out', href: bn ? '/bn' : '/' }, bn ? 'হোম' : 'Home'),
  )
}

function NotFound() {
  const bn = typeof location !== 'undefined' && /^\/bn(\/|$)/.test(location.pathname)
  return createElement(
    'section',
    { className: 'pad narrow' },
    createElement('p', { className: 'an', style: { fontSize: 'clamp(40px, 11vw, 72px)' } }, bn ? 'এই পেজ নেই।' : 'No such page.'),
    createElement('p', { className: 'body', style: { marginTop: 10 } }, bn ? 'লিংকটি পুরনো হতে পারে। হোম থেকে খুঁজুন।' : 'The link may be old. Search from the home page.'),
    createElement('a', { className: 'btn', href: bn ? '/bn' : '/' }, bn ? 'হোম' : 'Home'),
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
