import { defineConfig, loadEnv } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  // "As of" date baked into every page and card, so server and client agree.
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    // Runs the server on Cloudflare Workers (workerd in dev, a Worker in production). Must come first.
    // remoteBindings off: builds never open a remote Workers AI session (it kept the process alive). Production uses real bindings.
    cloudflare({ viteEnvironment: { name: 'ssr' }, remoteBindings: false }),
    tailwindcss(),
    // Every page is prerendered to plain HTML so links unfurl fast and pages load on 3G.
    // The sitemap lists every crawled page; it needs the public origin from .env.production. Crawled anchor links
    // (/about#reply) reach the sitemap list before the filter runs, so the filter also marks them excluded.
    tanstackStart({
      prerender: { enabled: true, crawlLinks: true, filter: (page) => !page.path.includes('#') || ((page.sitemap = { exclude: true }), false) },
      sitemap: { host: loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL },
    }),
    viteReact(),
  ],
}))
