import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TEMP_COMPANY_ID } from '../firebase/jobs.js'
import { loadHomeSummary } from '../firebase/home.js'
import { formatTimestamp, formatDateString } from '../utils/format.js'

function RecentJobCard({ entry, variant }) {
  const { job, lastActivity } = entry
  const className =
    variant === 'primary' ? 'home-recent home-recent--primary' : 'home-recent'
  return (
    <Link to={`/jobs/${job.id}`} className={className}>
      <div className="home-recent__top">
        <span className="home-recent__number">{job.jobNumber}</span>
        <span className="home-recent__time">{formatTimestamp(lastActivity)}</span>
      </div>
      <div className="home-recent__name">{job.jobName}</div>
      {job.location && (
        <div className="home-recent__location">{job.location}</div>
      )}
    </Link>
  )
}

function MissingSummaryCard({ entry }) {
  const { job, count, firstEntryId, firstEntryDate } = entry
  const target = firstEntryId
    ? `/jobs/${job.id}/daily/${firstEntryId}/edit`
    : `/jobs/${job.id}`
  return (
    <Link to={target} className="home-missing">
      <div className="home-missing__main">
        <div className="home-missing__top">
          <span className="home-missing__number">{job.jobNumber}</span>
          {firstEntryDate && (
            <span className="home-missing__date">
              {formatDateString(firstEntryDate)}
            </span>
          )}
        </div>
        <div className="home-missing__name">{job.jobName}</div>
      </div>
      <div className="home-missing__count" aria-label={`${count} missing`}>
        <span className="home-missing__count-num">{count}</span>
        <span className="home-missing__count-label">
          {count === 1 ? 'Missing' : 'Missing'}
        </span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const [recentJobs, setRecentJobs] = useState([])
  const [missingByJob, setMissingByJob] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const summary = await loadHomeSummary(TEMP_COMPANY_ID)
        if (cancelled) return
        setRecentJobs(summary.recentJobs)
        setMissingByJob(summary.missingByJob)
      } catch (err) {
        console.error('Failed to load home summary:', err)
        if (!cancelled) setError('Failed to load home page.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const [primaryJob, ...secondaryJobs] = recentJobs

  return (
    <div className="stack home-page">
      <div className="page-title-row">
        <h1>Home</h1>
      </div>

      <div className="section-header">
        <h2>Continue working</h2>
      </div>

      {isLoading && (
        <div className="home-skeleton">
          <div className="home-skeleton__primary" />
          <div className="home-skeleton__row">
            <div className="home-skeleton__secondary" />
            <div className="home-skeleton__secondary" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="card error-card">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && recentJobs.length === 0 && (
        <div className="card empty-state">
          <p className="text-muted">No recent projects.</p>
        </div>
      )}

      {!isLoading && !error && recentJobs.length > 0 && (
        <div className="home-recent-list">
          {primaryJob && (
            <RecentJobCard entry={primaryJob} variant="primary" />
          )}
          {secondaryJobs.length > 0 && (
            <div className="home-recent-secondary">
              {secondaryJobs.map((entry) => (
                <RecentJobCard key={entry.job.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      <Link to="/jobs" className="btn btn--block home-jobs-btn">
        All Jobs
      </Link>

      {isLoading && (
        <>
          <div className="section-header">
            <h2>Missing daily summaries</h2>
          </div>
          <div className="home-skeleton">
            <div className="home-skeleton__missing" />
            <div className="home-skeleton__missing" />
          </div>
        </>
      )}

      {!isLoading && !error && missingByJob.length > 0 && (
        <>
          <div className="section-header">
            <h2>Missing daily summaries</h2>
          </div>
          <div className="home-missing-list">
            {missingByJob.map((entry) => (
              <MissingSummaryCard key={entry.job.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
