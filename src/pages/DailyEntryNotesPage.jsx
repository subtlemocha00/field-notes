import { Link, useParams } from 'react-router-dom'
import FieldNotesSection from '../components/FieldNotesSection.jsx'

export default function DailyEntryNotesPage() {
  const { jobId, dailyEntryId } = useParams()

  return (
    <div className="stack">
      <div>
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}`}
          className="back-link"
        >
          ← Daily entry
        </Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">Field Notes</span>
        </h1>
      </div>

      <FieldNotesSection jobId={jobId} dailyEntryId={dailyEntryId} />
    </div>
  )
}
