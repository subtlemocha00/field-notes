import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJob, updateJob } from '../firebase/jobs.js'

export default function EditJobPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [jobNumber, setJobNumber] = useState('')
  const [jobName, setJobName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const job = await getJob(jobId)
        if (cancelled) return
        if (!job) {
          setLoadError('Job not found.')
          return
        }
        setJobNumber(job.jobNumber || '')
        setJobName(job.jobName || '')
        setLocation(job.location || '')
        setDescription(job.description || '')
      } catch (err) {
        console.error('Failed to load job:', err)
        if (!cancelled) setLoadError('Failed to load job.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [jobId])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!jobNumber.trim() || !jobName.trim()) {
      setError('Job number and job name are required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await updateJob(jobId, { jobNumber, jobName, location, description })
      navigate(`/jobs/${jobId}`, { replace: true })
    } catch (err) {
      console.error('Failed to update job:', err)
      setError('Failed to save changes. Please try again.')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading job…</p>
  }

  if (loadError) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{loadError}</p>
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
        <Link to={`/jobs/${jobId}`} className="back-link">← Back to job</Link>
      </div>

      <div className="page-title-row">
        <h1>Edit job</h1>
      </div>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">Job number *</span>
          <input
            type="text"
            className="input"
            value={jobNumber}
            onChange={(e) => setJobNumber(e.target.value)}
            disabled={isSaving}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Job name *</span>
          <input
            type="text"
            className="input"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            disabled={isSaving}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Location</span>
          <input
            type="text"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="field">
          <span className="field__label">Description</span>
          <textarea
            className="input textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
        </label>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="submit" className="btn btn--block" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
