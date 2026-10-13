import type { TrendPoint } from '../data/index.ts'
import { monthName } from '../lib/i18n.ts'

const short = (m: string) => monthName(Number(m.slice(5, 7)))

/**
 * New bans per month as red bars above the baseline, reopenings as green bars below it,
 * and how many places are closed as a line. All three count places, so one axis is honest.
 */
export function TrendChart({ data, compact }: { data: TrendPoint[]; compact?: boolean }) {
  const W = 340, H = compact ? 90 : 190, top = 24, base = compact ? H - 16 : H - 46, under = compact ? 0 : 22
  const max = Math.max(4, ...data.map((d) => Math.max(d.closed, d.bans)))
  const maxR = Math.max(1, ...data.map((d) => d.reopened))
  const step = (W - 16) / data.length, bw = Math.min(14, step * 0.55)
  const x = (i: number) => 8 + step * i + step / 2
  const y = (v: number) => base - (v / max) * (base - top)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.closed).toFixed(1)}`).join('')
  const peak = data.reduce((a, b) => (b.bans > a.bans ? b : a), data[0]!)
  const last = data.at(-1)!
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Last 13 months: ${last.closed} places closed now; most new bans in ${short(peak.month)} (${peak.bans}).`}>
        <line x1="8" x2={W - 8} y1={base} y2={base} stroke="var(--ch)" />
        {data.map((d, i) => (
          <g key={d.month}>
            {d.bans > 0 && <rect x={x(i) - bw / 2} y={y(d.bans)} width={bw} height={base - y(d.bans)} rx="2" fill="var(--cx)" opacity="0.85"><title>{`${short(d.month)}: ${d.bans} new bans`}</title></rect>}
            {!compact && d.reopened > 0 && <rect x={x(i) - bw / 2} y={base + 2} width={bw} height={(d.reopened / maxR) * under} rx="2" fill="var(--co)"><title>{`${short(d.month)}: ${d.reopened} reopened`}</title></rect>}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--pon)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(last.closed)} r="4.5" fill="var(--pon)" stroke="var(--pp)" strokeWidth="2" />
        <g fontFamily="ui-monospace,Menlo,monospace" fontSize="11" fill="var(--c2)">
          <text x={x(data.length - 1) - 8} y={y(last.closed) - 8} textAnchor="end" fontWeight="700" fill="var(--pon)">{last.closed} closed now</text>
          {!compact && data.map((d, i) => (i % 3 === 0 || i === data.length - 1 ? <text key={d.month} x={x(i)} y={H - 6} textAnchor="middle">{short(d.month)}</text> : null))}
        </g>
      </svg>
      {!compact && (
        <figcaption className="lab" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
          <span><i style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--cx)', marginRight: 5 }} />New bans</span>
          <span><i style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--co)', marginRight: 5 }} />Reopened</span>
          <span><i style={{ display: 'inline-block', width: 14, height: 3, background: 'var(--pon)', marginRight: 5, verticalAlign: 3 }} />Closed now</span>
          {peak.bans > 0 && <span>Most: {short(peak.month)}, {peak.bans} new</span>}
        </figcaption>
      )}
    </figure>
  )
}
