import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { createJob } from '../firebase/jobs.js'

export default function CreateJobPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [jobNumber, setJobNumber] = useState('')
  const [jobName, setJobName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!jobNumber.trim() || !jobName.trim()) {
      setError('Job number and job name are required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const id = await createJob(
        { jobNumber, jobName, location, description },
        user
      )
      navigate(`/jobs/${id}`, { replace: true })
    } catch (err) {
      console.error('Failed to create job:', err)
      setError('Failed to create job. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-title-row">
        <h1>New job</h1>
        <Link to="/jobs" className="btn btn--secondary">
          Cancel
        </Link>
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
            {isSaving ? 'Saving…' : 'Create job'}
          </button>
        </div>
      </form>
    </div>
  )
}
