import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // "As of" date baked into every page and card, so server and client agree.
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    // Runs the server on Cloudflare Workers (workerd in dev, a Worker in production). Must come first.
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    // Every page is prerendered to plain HTML so links unfurl fast and pages load on 3G.
    tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
    viteReact(),
  ],
})
