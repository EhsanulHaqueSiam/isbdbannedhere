import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EM, caption, fitSize, tagOptions, verdictWords } from './captions.ts'
import type { Item } from '../data/index.ts'
import type { Verdict } from '../data/tools.ts'

test('fitSize keeps every status word and the longest name inside a story card', () => {
  const inner = 920
  for (const word of ['BANNED.', 'RESTRICTED.', 'UNCLEAR.', 'BANNED OR NOT?', 'REOPENED.', 'NO REPORTS.']) {
    const px = fitSize(word, inner, 250, { lines: 2, min: 110 })
    const longest = Math.max(...word.split(' ').map((w) => w.length))
    assert.ok(longest * EM.anton * px <= inner, `${word} at ${px}px`)
  }
  // A short word stays at the cap; a long one shrinks.
  assert.equal(fitSize('BANNED.', inner, 250, { lines: 2 }), 250)
  assert.ok(fitSize('RESTRICTED.', inner, 250, { lines: 1 }) < 250)
})

test('fitSize wraps into the allowed lines before shrinking, and its floor never overflows a word', () => {
  const name = 'University of Wales Trinity Saint David'
  const one = fitSize(name, 900, 200, { lines: 1 })
  const three = fitSize(name, 900, 200, { lines: 3 })
  assert.ok(three > one)
  // The floor is ignored when even one word would not fit at it.
  assert.equal(fitSize('Supercalifragilistic', 200, 100, { min: 80 }), Math.floor(200 / (20 * EM.anton)))
})

test('fitSize measures Bangla with the Bangla face', () => {
  assert.equal(fitSize('নিষিদ্ধ নাকি না?', 920, 250), Math.floor(920 / ('নিষিদ্ধ নাকি না?'.length * EM.bangla)))
})

const item = (over: Partial<Item> = {}) =>
  ({ id: 'uae', category: 'tourism', name: 'UAE tourist visa', nameBn: 'ইউএই টুরিস্ট ভিসা', aliases: [], events: [], state: { status: 'shut', rows: {} }, strip: [], conf: { sources: 1, best: 'press' }, href: '/tourism/uae', ...over }) as Item

test('caption is Bangla first, English below; tags and the friend line sit above the hashtag', () => {
  const c = caption(item(), { mode: 'bn', asOf: '2026-10-13', tags: ['uaemofa', 'uaemofa'], friend: true })
  const [bn, en, tags, tag] = c.split('\n\n')
  assert.match(bn!, /ইউএই টুরিস্ট ভিসা বাংলাদেশি ভ্রমণকারীদের জন্য বন্ধ।/)
  assert.match(en!, /^UAE tourist visa has shut out Bangladeshi travellers\. As of 13 Oct 2026\./)
  assert.equal(tags, '@uaemofa\n@friend কোনো ফি দেওয়ার আগে চেক করে নিও')
  assert.equal(tag, '#isBDbannedhere')
  const en2 = caption(item(), { mode: 'en', asOf: '2026-10-13' }).split('\n\n')
  assert.equal(en2.length, 2)
})

test('tag chips prefer X handles, dedupe, and work with no handles', () => {
  assert.deepEqual(tagOptions(item()), [])
  const t = tagOptions(item({ handles: { facebook: 'uae.gov', x: 'uaegov' }, officials: [{ name: 'Embassy', x: 'UAEGov' }, { name: 'MoFA', facebook: 'mofauae' }] }))
  assert.deepEqual(t.map((x) => x.handle), ['uaegov', 'mofauae'])
})

const v = (counts: Partial<Verdict['counts']>, kind: Verdict['kind'] = 'university'): Verdict => {
  const c = { shut: 0, disputed: 0, restricted: 0, unclear: 0, reopened: 0, none: 0, ...counts }
  const worst = (['shut', 'disputed', 'restricted', 'unclear', 'reopened'] as const).find((s) => c[s]) ?? 'none'
  return { worst, counts: c, total: Object.values(c).reduce((a, b) => a + b, 0), kind, top: [] }
}

test('verdict words count the loss, worst first, reopenings always shown', () => {
  assert.deepEqual(verdictWords(v({ shut: 20, restricted: 16, none: 2 }), 'en'), { big: '20 universities shut you out.', sub: '16 more restrict. 0 reopened. 38 tracked.', cell: '20 shut out' })
  assert.equal(verdictWords(v({ restricted: 1 }, 'place'), 'en').big, '1 place restricts you.')
  assert.equal(verdictWords(v({ none: 3 }), 'en').big, 'No reports.')
  assert.equal(verdictWords(v({ shut: 20 }), 'bn').big, '২০টি বিশ্ববিদ্যালয় আপনার জন্য বন্ধ।')
})
