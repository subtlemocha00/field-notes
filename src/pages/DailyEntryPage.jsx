import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDailyEntry } from '../firebase/dailyEntries.js'
import { formatDateString } from '../utils/format.js'

export default function DailyEntryPage() {
  const { jobId, dailyEntryId } = useParams()

  const [entry, setEntry] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await getDailyEntry(dailyEntryId)
        if (cancelled) return
        if (!result) {
          setError('Daily entry not found.')
        } else {
          setEntry(result)
        }
      } catch (err) {
        console.error('Failed to load daily entry:', err)
        if (!cancelled) setError('Failed to load daily entry.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dailyEntryId])

  if (isLoading) {
    return <p className="text-muted">Loading…</p>
  }

  if (error) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{error}</p>
        </div>
        <Link to={`/jobs/${jobId}`} className="btn btn--secondary">
          Back to job
        </Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <Link to={`/jobs/${jobId}`} className="back-link">← Back to job</Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">Daily entry</span>
          <span className="job-detail__name">{formatDateString(entry.date)}</span>
        </h1>
      </div>

      {entry.contractor && (
        <p className="entry-hub-meta">{entry.contractor}</p>
      )}

      <nav className="entry-hub-nav">
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/summary`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📋</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Summary</span>
            <span className="entry-hub-card__desc">Contractor · weather · crew · equipment</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>

        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/notes`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📝</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Field Notes</span>
            <span className="entry-hub-card__desc">Notes · photos · timestamps</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>

        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/survey`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📐</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Survey / Level Book</span>
            <span className="entry-hub-card__desc">Setups · shots · elevations</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>
      </nav>
    </div>
  )
}
