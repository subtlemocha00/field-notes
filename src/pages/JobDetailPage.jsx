import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJob, deleteJob } from '../firebase/jobs.js'
import { listDailyEntries } from '../firebase/dailyEntries.js'
import { formatDate } from '../utils/format.js'
import DailyEntryCard from '../components/DailyEntryCard.jsx'

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesError, setEntriesError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await getJob(jobId)
        if (!cancelled) {
          if (!result) {
            setError('Job not found.')
          } else {
            setJob(result)
          }
        }
      } catch (err) {
        console.error('Failed to load job:', err)
        if (!cancelled) setError('Failed to load job.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [jobId])

  useEffect(() => {
    let cancelled = false
    async function loadEntries() {
      setEntriesLoading(true)
      setEntriesError(null)
      try {
        const result = await listDailyEntries(jobId)
        if (!cancelled) setEntries(result)
      } catch (err) {
        console.error('Failed to load daily entries:', err)
        if (!cancelled) setEntriesError('Failed to load daily entries.')
      } finally {
        if (!cancelled) setEntriesLoading(false)
      }
    }
    loadEntries()
    return () => {
      cancelled = true
    }
  }, [jobId])

  async function handleDelete() {
    if (!confirm(`Delete job "${job.jobNumber} – ${job.jobName}"? This cannot be undone.`)) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteJob(jobId)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to delete job:', err)
      alert('Failed to delete job. Please try again.')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading job…</p>
  }

  if (error) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{error}</p>
        </div>
        <Link to="/" className="btn btn--secondary">
          Back to jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <Link to="/" className="back-link">← Back to jobs</Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">{job.jobNumber}</span>
          <span className="job-detail__name">{job.jobName}</span>
        </h1>
      </div>

      <div className="card stack">
        <div className="detail-row">
          <div className="detail-row__label">Location</div>
          <div className="detail-row__value">{job.location || '—'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-row__label">Description</div>
          <div className="detail-row__value detail-row__value--multiline">
            {job.description || '—'}
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row__label">Created</div>
          <div className="detail-row__value">{formatDate(job.createdAt)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-row__label">Last updated</div>
          <div className="detail-row__value">{formatDate(job.updatedAt)}</div>
        </div>
      </div>

      <div className="action-row">
        <Link to={`/jobs/${jobId}/edit`} className="btn">
          Edit
        </Link>
        <button
          type="button"
          className="btn btn--danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      <div className="section-header">
        <h2>Daily entries</h2>
        <Link to={`/jobs/${jobId}/daily/new`} className="btn">
          New daily entry
        </Link>
      </div>

      {entriesLoading && <p className="text-muted">Loading daily entries…</p>}

      {entriesError && !entriesLoading && (
        <div className="card error-card">
          <p>{entriesError}</p>
        </div>
      )}

      {!entriesLoading && !entriesError && entries.length === 0 && (
        <div className="card empty-state">
          <h2>No daily entries yet</h2>
          <p className="text-muted">Create the first daily entry for this job.</p>
          <Link to={`/jobs/${jobId}/daily/new`} className="btn">
            Create daily entry
          </Link>
        </div>
      )}

      {!entriesLoading && !entriesError && entries.length > 0 && (
        <div className="daily-list">
          {entries.map((entry) => (
            <DailyEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
