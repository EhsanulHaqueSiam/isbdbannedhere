import { createFileRoute, notFound } from '@tanstack/react-router'
import { getItem } from '../../../../data/api.ts'
import { ShareCard, formatSize, type Format } from '../../../../components/Card.tsx'

// Bare card at real pixel size. scripts/cards.ts screenshots this into public/cards/.
export const Route = createFileRoute('/card/$category/$id/$format')({
  validateSearch: (s: Record<string, unknown>) => ({ anim: s.anim === 1 || s.anim === '1' }),
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
    const { anim } = Route.useSearch()
    return <ShareCard item={item} format={format as Format} anim={anim} />
  },
})
