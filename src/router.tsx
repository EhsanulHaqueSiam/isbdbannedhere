import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { track } from './lib/track.ts'
import { consent, loadPixels } from './lib/pixels.ts'

export function getRouter() {
  const router = createRouter({ routeTree, scrollRestoration: true, defaultPreload: 'intent' })
  // One $pageview per page the reader actually sees, including client-side navigations.
  if (typeof window !== 'undefined' && consent() === 'yes') loadPixels()
  if (typeof window !== 'undefined') router.subscribe('onResolved', ({ toLocation, fromLocation }) => toLocation.href !== fromLocation?.href && track('$pageview'))
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
