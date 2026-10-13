import { type } from 'arktype'

import { categories } from './rows.ts'
export { categories, rowsByCategory, type Category, type Row } from './rows.ts'

const isoDate = type(/^\d{4}(-\d{2}(-\d{2})?)?$/)

export const Source = type({
  url: 'string.url',
  publisher: 'string',
  'title?': 'string',
  'date?': isoDate,
  tier: "'official' | 'press' | 'community'",
  'archiveUrl?': 'string.url',
  'quote?': 'string',
})

export const Event = type({
  date: isoDate,
  action: "'unavailable' | 'paused' | 'restricted' | 'reopened' | 'extended' | 'denied'",
  rows: 'string[]',
  'until?': isoDate.or('null'),
  summary: 'string',
  'summaryBn?': 'string',
  sources: Source.array().atLeastLength(1),
})

const Handles = type({ 'x?': /^[A-Za-z0-9_]{1,15}$/, 'facebook?': /^[A-Za-z0-9.\-]{3,80}$/, 'instagram?': /^[A-Za-z0-9._]{1,30}$/ })

export const Entity = type({
  id: /^[a-z0-9-]+$/,
  category: type.enumerated(...categories),
  name: 'string',
  'nameBn?': 'string',
  aliases: 'string[]',
  'country?': /^[A-Z]{2}$/,
  'city?': 'string',
  'domain?': 'string',
  'checked?': isoDate,
  events: Event.array(),
  'stillOpen?': type({ name: 'string', 'note?': 'string' }).array(),
  'photo?': { src: 'string', credit: 'string' },
  // Official social accounts, for "Tag them" in the share sheet. Usernames without @, taken from the entity's own site.
  'handles?': Handles,
  // Who answers for a country-level ban: embassy or high commission in Dhaka, foreign ministry. Same handle format.
  'officials?': type({ name: 'string' }).and(Handles).array(),
})

export type Source = typeof Source.infer
export type Event = typeof Event.infer
export type Entity = typeof Entity.infer

export const VisaFree = type({
  source: { url: 'string.url', title: 'string', retrieved: isoDate, license: 'string' },
  destinations: type({
    country: /^[A-Z]{2}$/,
    name: 'string',
    'nameBn?': 'string',
    access: "'visa-free' | 'voa' | 'evisa'",
    'days?': 'number | null',
  }).array(),
})
export type VisaFree = typeof VisaFree.infer
