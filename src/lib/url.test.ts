import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUrl } from './url.ts'

test('the same article in different forms is one URL', () => {
  const want = 'https://thedailystar.net/news/uae-visa-123'
  for (const u of [
    'https://www.thedailystar.net/news/uae-visa-123',
    'http://thedailystar.net/news/uae-visa-123/',
    'https://m.thedailystar.net/news/uae-visa-123?utm_source=fb&fbclid=abc#top',
    'thedailystar.net/news/uae-visa-123/amp',
    '  https://amp.thedailystar.net/news/uae-visa-123  ',
  ])
    assert.equal(normalizeUrl(u), want, u)
})

test('keeps meaningful query params', () => {
  assert.equal(normalizeUrl('https://example.com/a?id=5&utm_medium=x'), 'https://example.com/a?id=5')
})

test('rejects what is not a public web link', () => {
  for (const u of ['', 'not a link', 'javascript:alert(1)', 'ftp://example.com/a', 'http://localhost:3000', 'http://192.168.1.1/x', 'mailto:a@b.com'])
    assert.equal(normalizeUrl(u), null, u)
})
