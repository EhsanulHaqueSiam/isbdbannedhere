// SubQ Snap, Subquadratic's decision model: named questions over a state, answered as probabilities, no text
// (https://docs.subq.ai/endpoints/decisions-api/). Official API with the SUBQ_API_KEY secret until treg offers it
// through OpenRouter; swap the fetch below then.

/** What a receipt or headline reports for Bangladeshis. `none` covers everything else. */
export const verdicts = {
  shut: 'a new ban, suspension or halt aimed at Bangladeshis: visas, admissions, work permits, payments or entry',
  restricted: 'new extra conditions, caps, deposits or limits aimed at Bangladeshis',
  reopened: 'a ban or suspension on Bangladeshis lifted or reopened',
  none: 'anything else: general news, crime, sport, agreements, or rules that apply to everyone',
} as const
export type Verdict = keyof typeof verdicts

type Choice = { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }

/**
 * Asks Snap one verdict question per state (1-16 per call). Returns the verdict for each, or 'none' when Snap is
 * unsure (below `min` probability), so only confident calls reach the review queue.
 */
export async function snapVerdicts(key: string, states: string[], min = 0.6): Promise<Verdict[]> {
  const questions = Object.fromEntries(
    states.map((_, i) => [`s${i}`, { type: 'choice', instructions: `Item ${i}: what does it report for Bangladeshi nationals specifically?`, criteria: verdicts }]),
  )
  const res = await fetch('https://api.subq.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'subq-snap-preview', state: states.map((s, i) => `Item ${i}:\n${s}`).join('\n\n'), questions }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`SubQ Snap ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const { answers } = (await res.json()) as { answers: Record<string, Choice> }
  return states.map((_, i) => {
    const a = answers[`s${i}`]
    return a && a.choice in verdicts && (a.probabilities[a.choice] ?? 0) >= min ? (a.choice as Verdict) : 'none'
  })
}
