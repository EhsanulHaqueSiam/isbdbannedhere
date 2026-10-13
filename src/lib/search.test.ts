import { test } from 'node:test'
import assert from 'node:assert/strict'
import { search, type Searchable } from './search.ts'

const list: Searchable[] = [
  { name: 'London Metropolitan University', aliases: ['London Met'], status: 'shut', country: 'GB', city: 'London', category: 'university' },
  { name: 'Stripe', aliases: [], domain: 'stripe.com', status: 'shut', category: 'company' },
  { name: 'University of Sydney', aliases: [], status: 'none', country: 'AU', category: 'university' },
]

test('names, aliases and typos', () => {
  assert.equal(search(list, 'london met')[0]?.name, 'London Metropolitan University')
  assert.equal(search(list, 'strpe')[0]?.name, 'Stripe')
})

test('a country or a category lists its places', () => {
  assert.deepEqual(search(list, 'uk').map((i) => i.name), ['London Metropolitan University'])
  assert.deepEqual(search(list, 'যুক্তরাজ্য').map((i) => i.name), ['London Metropolitan University'])
  assert.deepEqual(search(list, 'universities').map((i) => i.name), ['London Metropolitan University', 'University of Sydney'])
  assert.deepEqual(search(list, 'payment').map((i) => i.name), ['Stripe'])
})
