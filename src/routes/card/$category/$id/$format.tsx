import { createFileRoute, notFound } from '@tanstack/react-router'
import { getItem } from '../../../../data/api.ts'
import { ShareCard, formatSize, type Format } from '../../../../components/Card.tsx'

// Bare card at real pixel size (?lang=bn for the Bangla card), for checking cards in a browser and for scripts/video.ts.
export const Route = createFileRoute('/card/$category/$id/$format')({
  validateSearch: (s: Record<string, unknown>) => ({ anim: s.anim === 1 || s.anim === '1', lang: s.lang === 'bn' ? ('bn' as const) : ('en' as const) }),
  loader: async ({ params }) => {
    if (!(params.format in formatSize)) throw notFound()
    const d = await getItem({ data: { slug: params.category, id: params.id } })
    if (!d) throw notFound()
    return d
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: () => {
    const { item } = Route.useLoaderData()
    const { format } = Route.useParams()
    const { anim, lang } = Route.useSearch()
    return <ShareCard item={item} format={format as Format} anim={anim} lang={lang} />
  },
})
