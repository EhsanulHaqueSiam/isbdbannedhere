// Map math shared by the server (src/data/map.ts picks which land to send) and the share card (which crops it).
// Units are those of src/data/world.json: viewBox 0 0 1000 440, equirectangular, 83°N to 57°S.

export type Pt = [x: number, y: number]
export type Box = [x: number, y: number, w: number, h: number]

/** Longitude and latitude to map units. */
export const project = ([lon, lat]: [number, number]): Pt => [((lon + 180) / 360) * 1000, ((83 - lat) / 140) * 440]

/** Dhaka-ish middle of Bangladesh. */
export const BD_AT = project([90.35, 23.7])

// Too small for the 1:110m outlines: drawn as dots (lon, lat).
export const dotsAt: Partial<Record<string, [number, number]>> = { BH: [50.55, 26.07], MV: [73.22, 3.2], SG: [103.82, 1.35], MT: [14.4, 35.9], QA: [51.18, 25.35] }

/**
 * The picture on 1080-wide share cards: its height, and the share of it kept clear at the bottom for the flags laid
 * over it (story only; the post's flags sit below its shorter picture).
 */
export const ART = { story: { h: 860, flags: 0.18 }, post: { h: 440, flags: 0 } } as const
export type Art = (typeof ART)[keyof typeof ART]

/**
 * The map crop for a card picture: every point with room around it, plus 15% of the width above and below each for
 * its label, all above the flags. Neighbours (Laos) get a close-up; far places (the UK) a wide view. With one point
 * (no place), a region around it.
 */
export function frame(points: Pt[], art: Art): Box {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const [dx, dy] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
  const pad = Math.max(40, Math.hypot(dx, dy) * 0.25, points.length === 1 ? 220 : 0)
  const open = (1 - art.flags) / (1080 / art.h) // height above the flags, per unit of width
  const w = Math.max(dx + 2 * pad, (dy + 2 * pad) / open, dy / (open - 0.3))
  const h = (w * art.h) / 1080
  return [Math.min(...xs) + dx / 2 - w / 2, Math.min(...ys) + dy / 2 - (h * (1 - art.flags)) / 2, w, h]
}
