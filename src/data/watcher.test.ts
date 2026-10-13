import { test } from 'node:test'
import assert from 'node:assert/strict'
import { candidates, decode, parseRss } from './watcher.ts'

const rss = `<rss><channel>
<item><title>UAE halts visas for Bangladeshi workers &amp; tourists - The Daily Star</title><link>https://news.google.com/rss/articles/AAA?oc=5</link><pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate><source url="https://www.thedailystar.net">The Daily Star</source></item>
<item><title>Cricket: Bangladesh beat Zimbabwe - Prothom Alo</title><link>https://news.google.com/rss/articles/BBB?oc=5</link><pubDate>Mon, 12 Oct 2026 09:00:00 GMT</pubDate><source url="https://en.prothomalo.com">Prothom Alo</source></item>
<item><title>India eases visas for Nepalis - The Hindu</title><link>https://news.google.com/rss/articles/CCC?oc=5</link><source url="https://www.thehindu.com">The Hindu</source></item>
</channel></rss>`

test('parses Google News items, decodes entities, strips the publisher suffix', () => {
  const s = parseRss(rss)
  assert.equal(s.length, 3)
  assert.deepEqual(s[0], { url: 'https://news.google.com/rss/articles/AAA?oc=5', title: 'UAE halts visas for Bangladeshi workers & tourists', publisher: 'The Daily Star', published: '2026-10-12' })
})

test('keeps only new headlines that name Bangladesh', () => {
  const s = parseRss(rss)
  const known = new Set(['cricket bangladesh beat zimbabwe'])
  assert.deepEqual(candidates(s, known).map((x) => x.publisher), ['The Daily Star'])
  assert.deepEqual(candidates([...s, s[0]!], new Set()).map((x) => x.publisher), ['The Daily Star', 'Prothom Alo'])
})

test('decodes named and numeric entities', () => {
  assert.equal(decode('How UAE&#039;s visa &#x27;rules&#x27; &amp; more&nbsp;'), "How UAE's visa 'rules' & more ")
})
