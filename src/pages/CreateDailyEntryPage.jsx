import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { todayLocalISO } from '../utils/format.js'
import {
  createDailyEntry,
  DuplicateDailyEntryError
} from '../firebase/dailyEntries.js'
import WorkerRows from '../components/WorkerRows.jsx'
import EquipmentRows from '../components/EquipmentRows.jsx'

export default function CreateDailyEntryPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [date, setDate] = useState(todayLocalISO())
  const [contractor, setContractor] = useState('')
  const [weatherAM, setWeatherAM] = useState({ conditions: '', temperature: '' })
  const [weatherPM, setWeatherPM] = useState({ conditions: '', temperature: '' })
  const [workers, setWorkers] = useState([])
  const [equipment, setEquipment] = useState([])
  const [notes, setNotes] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!date.trim()) {
      setError('Date is required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const id = await createDailyEntry(
        jobId,
        { date, contractor, weatherAM, weatherPM, workers, equipment, notes },
        user
      )
      navigate(`/jobs/${jobId}/daily/${id}`, { replace: true })
    } catch (err) {
      console.error('Failed to create daily entry:', err)
      if (err instanceof DuplicateDailyEntryError) {
        setError(`A daily entry for ${err.date} already exists for this job.`)
      } else {
        setError('Failed to create daily entry. Please try again.')
      }
      setIsSaving(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <Link to={`/jobs/${jobId}`} className="back-link">← Back to job</Link>
      </div>

      <div className="page-title-row">
        <h1>New daily entry</h1>
      </div>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">Date *</span>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSaving}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Contractor</span>
          <input
            type="text"
            className="input"
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
            disabled={isSaving}
          />
        </label>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Weather AM</legend>
          <div className="field-row">
            <label className="field">
              <span className="field__label">Conditions</span>
              <input
                type="text"
                className="input"
                placeholder="e.g., sunny, overcast"
                value={weatherAM.conditions}
                onChange={(e) =>
                  setWeatherAM({ ...weatherAM, conditions: e.target.value })
                }
                disabled={isSaving}
              />
            </label>
            <label className="field">
              <span className="field__label">Temperature</span>
              <input
                type="text"
                className="input"
                placeholder="e.g., 12°C"
                value={weatherAM.temperature}
                onChange={(e) =>
                  setWeatherAM({ ...weatherAM, temperature: e.target.value })
                }
                disabled={isSaving}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Weather PM</legend>
          <div className="field-row">
            <label className="field">
              <span className="field__label">Conditions</span>
              <input
                type="text"
                className="input"
                placeholder="e.g., light rain"
                value={weatherPM.conditions}
                onChange={(e) =>
                  setWeatherPM({ ...weatherPM, conditions: e.target.value })
                }
                disabled={isSaving}
              />
            </label>
            <label className="field">
              <span className="field__label">Temperature</span>
              <input
                type="text"
                className="input"
                placeholder="e.g., 18°C"
                value={weatherPM.temperature}
                onChange={(e) =>
                  setWeatherPM({ ...weatherPM, temperature: e.target.value })
                }
                disabled={isSaving}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Workers</legend>
          <WorkerRows
            workers={workers}
            onChange={setWorkers}
            disabled={isSaving}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset__legend">Equipment</legend>
          <EquipmentRows
            equipment={equipment}
            onChange={setEquipment}
            disabled={isSaving}
          />
        </fieldset>

        <label className="field">
          <span className="field__label">Daily summary notes</span>
          <textarea
            className="input textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSaving}
          />
        </label>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="submit" className="btn btn--block" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Create daily entry'}
          </button>
        </div>
      </form>
    </div>
  )
}
