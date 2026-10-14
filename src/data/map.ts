import world from './world.json' with { type: 'json' }
import { ART, BD_AT, dotsAt, frame, project, type Box, type Pt } from '../lib/map.ts'

// The share card's map, for entries without a photo: Bangladesh, the place, and the land around them. Server only
// (getMap in api.ts), so the 120 KB world outline never ships to phones; a card gets just the land its crop shows.

const paths: Record<string, string> = world.paths

const points = (d: string): Pt[] => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
function bounds(pts: Pt[]): Box {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
}
const overlaps = (a: Box, b: Box) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]

/** Middle of a country's biggest outline (so Alaska doesn't drag the USA north), or its dot. */
function centre(code: string): Pt | undefined {
  const d = paths[code]
  if (!d) return dotsAt[code] && project(dotsAt[code])
  const rings = d.split(/(?=M)/).map((r) => bounds(points(r)))
  const [x, y, w, h] = rings.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a))
  return [x + w / 2, y + h / 2]
}

export type StoryMap = { land: string; bd: string; place?: string; at?: Pt }

/** Map data for a place (ISO code), or for Bangladesh alone when `code` is empty (global companies). */
export function storyMap(code: string): StoryMap {
  const at = code ? centre(code) : undefined
  const pts = at ? [BD_AT, at] : [BD_AT]
  // Send the land either crop (the tall story picture, the wide post one) can show.
  const view = bounds([frame(pts, ART.story), frame(pts, ART.post)].flatMap(([x, y, w, h]): Pt[] => [[x, y], [x + w, y + h]]))
  const land = Object.entries(paths)
    .filter(([c, d]) => c !== 'BD' && c !== code && overlaps(bounds(points(d)), view))
    .map(([, d]) => d)
    .join('')
  return { land, bd: paths.BD!, place: code ? paths[code] : undefined, at }
}
