import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import JobCard from '../components/JobCard.jsx'
import { listJobs, TEMP_COMPANY_ID } from '../firebase/jobs.js'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await listJobs(TEMP_COMPANY_ID)
        if (!cancelled) setJobs(result)
      } catch (err) {
        console.error('Failed to load jobs:', err)
        if (!cancelled) setError('Failed to load jobs.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return jobs
    return jobs.filter((job) => {
      const haystack = `${job.jobNumber} ${job.jobName} ${job.location}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [jobs, searchTerm])

  return (
    <div className="stack">
      <div className="page-title-row">
        <h1>Jobs</h1>
        <Link to="/jobs/new" className="btn">
          New job
        </Link>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Search by number, name, or location"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading && <p className="text-muted">Loading jobs…</p>}

      {error && !isLoading && (
        <div className="card error-card">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <div className="card empty-state">
          <h2>No jobs yet</h2>
          <p className="text-muted">Create your first job to get started.</p>
          <Link to="/jobs/new" className="btn">
            Create job
          </Link>
        </div>
      )}

      {!isLoading && !error && jobs.length > 0 && filteredJobs.length === 0 && (
        <p className="text-muted">No jobs match &ldquo;{searchTerm}&rdquo;.</p>
      )}

      {!isLoading && !error && filteredJobs.length > 0 && (
        <div className="job-list">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
