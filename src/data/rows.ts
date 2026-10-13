// Categories and their rows. No dependencies, safe for the browser bundle.
export const categories = ['university', 'company', 'city', 'publication', 'tourism', 'country'] as const
export type Category = (typeof categories)[number]

// What each category tracks. Event.rows names a subset; an empty list means all rows.
export const rowsByCategory = {
  university: ['bachelors', 'masters', 'phd', 'research'],
  company: ['signup', 'pay', 'getpaid', 'jobs'],
  city: ['visit', 'medical', 'study', 'work'],
  publication: ['publish', 'getpaid', 'attend', 'fund'],
  tourism: ['entry', 'transit', 'book'],
  country: ['student', 'work', 'settle'],
} as const satisfies Record<Category, readonly string[]>
export type Row = (typeof rowsByCategory)[Category][number]
