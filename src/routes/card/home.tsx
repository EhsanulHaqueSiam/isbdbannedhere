import { createFileRoute } from '@tanstack/react-router'
import { getHome } from '../../data/api.ts'
import { HomeCard } from '../../components/Card.tsx'

export const Route = createFileRoute('/card/home')({
  loader: () => getHome(),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: () => {
    const d = Route.useLoaderData()
    return <HomeCard places={d.totals.places} sources={d.totals.sources} />
  },
})
