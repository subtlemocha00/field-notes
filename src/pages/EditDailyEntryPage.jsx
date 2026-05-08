import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getDailyEntry,
  updateDailyEntry,
  DuplicateDailyEntryError
} from '../firebase/dailyEntries.js'
import WorkerRows from '../components/WorkerRows.jsx'
import EquipmentRows from '../components/EquipmentRows.jsx'

export default function EditDailyEntryPage() {
  const { jobId, dailyEntryId } = useParams()
  const navigate = useNavigate()

  const [date, setDate] = useState('')
  const [contractor, setContractor] = useState('')
  const [weatherAM, setWeatherAM] = useState({ conditions: '', temperature: '' })
  const [weatherPM, setWeatherPM] = useState({ conditions: '', temperature: '' })
  const [workers, setWorkers] = useState([])
  const [equipment, setEquipment] = useState([])
  const [notes, setNotes] = useState('')

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
        const entry = await getDailyEntry(dailyEntryId)
        if (cancelled) return
        if (!entry) {
          setLoadError('Daily entry not found.')
          return
        }
        setDate(entry.date || '')
        setContractor(entry.contractor || '')
        setWeatherAM(entry.weatherAM)
        setWeatherPM(entry.weatherPM)
        setWorkers(entry.workers)
        setEquipment(entry.equipment)
        setNotes(entry.notes || '')
      } catch (err) {
        console.error('Failed to load daily entry:', err)
        if (!cancelled) setLoadError('Failed to load daily entry.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dailyEntryId])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!date.trim()) {
      setError('Date is required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await updateDailyEntry(dailyEntryId, jobId, {
        date,
        contractor,
        weatherAM,
        weatherPM,
        workers,
        equipment,
        notes
      })
      navigate(`/jobs/${jobId}/daily/${dailyEntryId}`, { replace: true })
    } catch (err) {
      console.error('Failed to update daily entry:', err)
      if (err instanceof DuplicateDailyEntryError) {
        setError(`Another daily entry for ${err.date} already exists for this job.`)
      } else {
        setError('Failed to save changes. Please try again.')
      }
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading daily entry…</p>
  }

  if (loadError) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{loadError}</p>
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
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}`}
          className="back-link"
        >
          ← Back to daily entry
        </Link>
      </div>

      <div className="page-title-row">
        <h1>Edit daily entry</h1>
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
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
