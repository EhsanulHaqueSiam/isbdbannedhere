import type { PlacedStory } from '../data/tools-api.ts'
import { fitSize, dateRange, storyNames, storyTitle, weekLines } from '../lib/captions.ts'
import { categoryLabel, fmtDate, headline, type Lang } from '../lib/i18n.ts'
import { CardFrame, CardIcon, FRAME_INNER, mono, sans } from './Card.tsx'

// Weekly report slides (post size, 4:5): one summary, then one per story. /week shows them as a carousel; /share
// reuses the story slide as the image for each ready-made post.

type Counts = { banned: number; extended: number; restricted: number; reopened: number }

export function WeekSummary({ from, to, counts, stories, lang, url }: { from: string; to: string; counts: Counts; stories: PlacedStory[]; lang: Lang; url: string }) {
  const lines = weekLines(counts, lang)
  // One size for every line, set by the longest, so the stack reads as one block.
  const px = Math.min(...lines.map((l) => fitSize(l, FRAME_INNER, 150, { min: 64 })))
  const good = counts.reopened > 0 && counts.banned + counts.extended + counts.restricted === 0
  return (
    <CardFrame url={url} lang={lang} green={good}>
      <p style={mono(30)}>{lang === 'bn' ? 'এই সপ্তাহে' : 'This week'} · {dateRange(from, to, lang)}</p>
      <div>
        {lines.map((l) => <p key={l} className="an" style={{ fontSize: px, lineHeight: lang === 'bn' ? 1.2 : 0.95 }}>{l}</p>)}
      </div>
      {stories.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={mono(28)}>{lang === 'bn' ? 'সোয়াইপ করুন →' : 'Swipe →'}</p>
          {stories.slice(0, 4).map((s) => {
            const t = `${storyTitle(s, lang)}: ${headline[lang][s.status]}`
            return <p key={`${s.date}${s.category}${s.status}`} style={sans(fitSize(t, FRAME_INNER, 44, { face: 'sans', min: 30 }), 1.2)}>{t}</p>
          })}
        </div>
      ) : (
        <p style={sans(48, 1.2)}>{lang === 'bn' ? 'এই সপ্তাহে কোনো নতুন পরিবর্তনের খবর নেই।' : 'No new changes reported this week.'}</p>
      )}
    </CardFrame>
  )
}

export function StorySlide({ story, lang, url }: { story: PlacedStory; lang: Lang; url: string }) {
  const title = storyTitle(story, lang)
  const word = headline[lang][story.status]
  const one = story.items.length === 1
  const body = one ? (lang === 'bn' ? (story.summaryBn ?? story.summary) : story.summary) : storyNames(story, lang, 4)
  return (
    <CardFrame url={url} lang={lang} green={story.status === 'reopened'}>
      <p style={{ ...mono(30), display: 'flex', alignItems: 'center', gap: 16 }}>
        <CardIcon status={story.status} size={48} />
        {fmtDate(story.date, lang)} · {categoryLabel[lang][story.category]}
      </p>
      <div>
        <p className="an" style={{ fontSize: fitSize(title, FRAME_INNER, 140, { lines: 3, min: 64 }), lineHeight: lang === 'bn' ? 1.2 : 0.95 }}>{title}</p>
        <p className="an" style={{ fontSize: fitSize(word, FRAME_INNER, 120, { min: 64 }), lineHeight: lang === 'bn' ? 1.2 : 0.95, marginTop: 14 }}>{word}</p>
      </div>
      <p style={sans(fitSize(body, FRAME_INNER, 46, { lines: 4, face: 'sans', min: 30 }), 1.25)}>{body}</p>
      {story.publisher && <p style={{ ...mono(26), textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>{lang === 'bn' ? 'সূত্র' : 'Source'}: {story.publisher}</p>}
    </CardFrame>
  )
}
