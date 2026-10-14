import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ART, BD_AT, frame, type Box, type Pt } from '../lib/map.ts'
import { storyMap } from './map.ts'

// Inclusive, with float slack: the tightest crops put a point exactly on the edge of its label room.
const inside = ([x, y]: Pt, [bx, by, bw, bh]: Box, e = 1e-6) => x >= bx - e && x <= bx + bw + e && y >= by - e && y <= by + bh + e

test('a card map shows Bangladesh and the place, with room for labels above the flags', () => {
  for (const code of ['LA', 'GB', 'US', 'AU', 'BH']) {
    const m = storyMap(code)
    assert.ok(m.at, `${code} has a position`)
    for (const art of [ART.story, ART.post]) {
      const box = frame([BD_AT, m.at], art)
      assert.ok(Math.abs(box[2] / box[3] - 1080 / art.h) < 1e-9, `${code}: crop has the picture's shape`)
      // Labels sit up to 0.15 of the width above and below each point, and stay out of the flags' strip.
      const open: Box = [box[0], box[1] + box[2] * 0.15, box[2], box[3] * (1 - art.flags) - box[2] * 0.3]
      for (const p of [BD_AT, m.at]) assert.ok(inside(p, open), `${code}: ${p} clear of the edges and the flags`)
    }
  }
  assert.ok(storyMap('LA').place && storyMap('LA').land.length > 0)
  assert.equal(storyMap('').at, undefined, 'global entries get Bangladesh alone')
})
