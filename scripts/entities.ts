import { readdirSync, readFileSync } from 'node:fs'

const slug = { university: 'universities', company: 'companies', city: 'cities', publication: 'publications', tourism: 'tourism', country: 'countries' } as const

type Raw = { id: string; category: keyof typeof slug; events?: unknown[] }

/** Every entity in data/*.json with its URL segment. Scripts only; the app validates with ArkType. */
export function entities() {
  return readdirSync('data')
    .filter((f) => f.endsWith('.json') && f !== 'visa-free.json')
    .flatMap((f) => JSON.parse(readFileSync(`data/${f}`, 'utf8')) as Raw[])
    .map((e) => ({ ...e, slug: slug[e.category], reported: (e.events?.length ?? 0) > 0 }))
}
