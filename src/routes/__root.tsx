import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { IconSprite } from '../components/ui.tsx'

// Applied before paint so Night doesn't flash red.
const themeScript = "try{if(localStorage.getItem('isbd:theme')==='night')document.documentElement.dataset.theme='night'}catch(e){}"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Is BD banned here?' },
      { name: 'description', content: 'Which universities, companies, cities, publications, destinations and countries have shut out Bangladeshis, since when, and the receipts.' },
      { name: 'theme-color', content: '#e3141c' },
      { property: 'og:site_name', content: 'Is BD banned here?' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preload', href: '/fonts/anton.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: Shell,
})

function Shell({ children }: { children: React.ReactNode }) {
  const bn = useRouterState({ select: (s) => s.location.pathname === '/bn' || s.location.pathname.startsWith('/bn/') })
  return (
    <html lang={bn ? 'bn' : 'en'}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <IconSprite />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
