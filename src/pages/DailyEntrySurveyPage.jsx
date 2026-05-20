import { Link, useParams } from 'react-router-dom'
import SurveySection from '../components/SurveySection.jsx'

export default function DailyEntrySurveyPage() {
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
          <span className="job-detail__number">Survey / Level Book</span>
        </h1>
      </div>

      <SurveySection jobId={jobId} dailyEntryId={dailyEntryId} />
    </div>
  )
}
