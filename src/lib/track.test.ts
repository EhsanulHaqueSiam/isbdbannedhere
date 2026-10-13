import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageType } from './track.ts'

test('page types for analytics', () => {
  const cases: [path: string, type: string][] = [['/', 'home'], ['/bn', 'home'], ['/universities', 'category'], ['/bn/tourism/uae', 'entry'], ['/in/uae', 'hub'], ['/bn/check', 'tool'], ['/about', 'about'], ['/list', 'list']]
  for (const [p, t] of cases) assert.equal(pageType(p), t, p)
})
