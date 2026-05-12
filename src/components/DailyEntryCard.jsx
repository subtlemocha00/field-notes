import { Link } from 'react-router-dom'

// Parse a 'YYYY-MM-DD' string into the three parts the date column needs.
// Uses the same local-midnight Date construction as format.js to avoid
// UTC off-by-one on dates without a time component.
function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { day: '?', monthAbbr: '???', dowAbbr: '???' }
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return { day: '?', monthAbbr: '???', dowAbbr: '???' }
  const dt = new Date(y, m - 1, d)   // local midnight — no UTC shift
  return {
    day: String(d),
    monthAbbr: dt.toLocaleDateString('en', { month: 'short' }).toUpperCase(),
    dowAbbr: dt.toLocaleDateString('en', { weekday: 'short' }).toUpperCase(),
  }
}

// ── Weather summary (unchanged from original) ────────────────
function conditionsOf(weather) {
  if (!weather) return ''
  if (typeof weather === 'string') return weather
  return weather.conditions || ''
}

function weatherSummary(am, pm) {
  const a = conditionsOf(am)
  const p = conditionsOf(pm)
  if (a && p) return `${a} / ${p}`
  return a || p || ''
}

// ── Component ─────────────────────────────────────────────────
export default function DailyEntryCard({ entry }) {
  const { day, monthAbbr, dowAbbr } = parseDateParts(entry.date)
  const summary = weatherSummary(entry.weatherAM, entry.weatherPM)

  return (
    <Link
      to={`/jobs/${entry.jobId}/daily/${entry.id}`}
      className="daily-card"
    >
      {/* ── Date column: big number + mono month/dow ── */}
      <div className="daily-card__date-col">
        <b className="daily-card__day">{day}</b>
        <span className="daily-card__month-dow">{monthAbbr} · {dowAbbr}</span>
      </div>

      {/* ── Body: contractor, weather, author ── */}
      <div className="daily-card__body">
        {entry.contractor && (
          <div className="daily-card__contractor">{entry.contractor}</div>
        )}
        {summary && (
          <div className="daily-card__weather">{summary}</div>
        )}
        {entry.createdByName && (
          <div className="daily-card__author">by {entry.createdByName}</div>
        )}
      </div>
    </Link>
  )
}
