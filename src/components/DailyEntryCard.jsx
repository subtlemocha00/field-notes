import { Link } from 'react-router-dom'
import { formatDateString } from '../utils/format.js'

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

export default function DailyEntryCard({ entry }) {
  const summary = weatherSummary(entry.weatherAM, entry.weatherPM)
  return (
    <Link
      to={`/jobs/${entry.jobId}/daily/${entry.id}`}
      className="daily-card"
    >
      <div className="daily-card__date">{formatDateString(entry.date)}</div>
      {entry.contractor && (
        <div className="daily-card__contractor">{entry.contractor}</div>
      )}
      {summary && <div className="daily-card__weather">{summary}</div>}
      {entry.createdByName && (
        <div className="daily-card__author">by {entry.createdByName}</div>
      )}
    </Link>
  )
}
