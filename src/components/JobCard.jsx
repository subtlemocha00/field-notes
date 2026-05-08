import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format.js'

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="job-card">
      <div className="job-card__header">
        <span className="job-card__number">{job.jobNumber}</span>
        <span className="job-card__date">{formatDate(job.createdAt)}</span>
      </div>
      <div className="job-card__name">{job.jobName}</div>
      {job.location && (
        <div className="job-card__location">{job.location}</div>
      )}
    </Link>
  )
}
