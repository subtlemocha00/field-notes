import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getDailyEntry,
  deleteDailyEntry,
  WORKER_TYPE_LABELS,
  EQUIPMENT_TYPE_LABELS,
} from '../firebase/dailyEntries.js'
import { formatDate, formatDateString } from '../utils/format.js'

function workerLabel(type) {
  return WORKER_TYPE_LABELS[type] || type
}

function equipmentLabel(type) {
  return EQUIPMENT_TYPE_LABELS[type] || type
}

function weatherText(weather) {
  if (!weather) return ''
  const parts = []
  if (weather.conditions) parts.push(weather.conditions)
  if (weather.temperature) parts.push(weather.temperature)
  return parts.join(' · ')
}

function Field({ label, value, multiline, children }) {
  return (
    <div className="detail-row">
      <div className="detail-row__label">{label}</div>
      <div
        className={
          multiline
            ? 'detail-row__value detail-row__value--multiline'
            : 'detail-row__value'
        }
      >
        {children ?? (value || '—')}
      </div>
    </div>
  )
}

function WorkersValue({ workers }) {
  if (!workers || workers.length === 0) return '—'
  return (
    <ul className="bare-list">
      {workers.map((w, i) => (
        <li key={i}>
          {workerLabel(w.type)} × {w.count}
        </li>
      ))}
    </ul>
  )
}

function EquipmentValue({ equipment }) {
  if (!equipment || equipment.length === 0) return '—'
  return (
    <ul className="bare-list">
      {equipment.map((e, i) => {
        const isManual = e.type === 'manual'
        const name = isManual && e.details ? e.details : equipmentLabel(e.type)
        const detailSuffix = !isManual && e.details ? ` — ${e.details}` : ''
        return (
          <li key={i}>
            {name} × {e.quantity}
            {detailSuffix}
          </li>
        )
      })}
    </ul>
  )
}

export default function DailyEntrySummaryPage() {
  const { jobId, dailyEntryId } = useParams()
  const navigate = useNavigate()

  const [entry, setEntry] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await getDailyEntry(dailyEntryId)
        if (cancelled) return
        if (!result) {
          setError('Daily entry not found.')
        } else {
          setEntry(result)
        }
      } catch (err) {
        console.error('Failed to load daily entry:', err)
        if (!cancelled) setError('Failed to load daily entry.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dailyEntryId])

  async function handleDelete() {
    if (!confirm(`Delete daily entry for ${entry.date}? This cannot be undone.`)) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteDailyEntry(dailyEntryId)
      navigate(`/jobs/${jobId}`, { replace: true })
    } catch (err) {
      console.error('Failed to delete daily entry:', err)
      alert('Failed to delete daily entry. Please try again.')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading…</p>
  }

  if (error) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{error}</p>
        </div>
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}`}
          className="btn btn--secondary"
        >
          Back to daily entry
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
          ← Daily entry
        </Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">Summary</span>
          <span className="job-detail__name">{formatDateString(entry.date)}</span>
        </h1>
      </div>

      <div className="card stack">
        <Field label="Contractor" value={entry.contractor} />
        <Field label="Weather AM" value={weatherText(entry.weatherAM)} />
        <Field label="Weather PM" value={weatherText(entry.weatherPM)} />
        <Field label="Workers">
          <WorkersValue workers={entry.workers} />
        </Field>
        <Field label="Equipment">
          <EquipmentValue equipment={entry.equipment} />
        </Field>
        <Field label="Daily summary notes" value={entry.notes} multiline />
        <Field label="Created by" value={entry.createdByName} />
        <Field label="Created" value={formatDate(entry.createdAt)} />
        <Field label="Last updated" value={formatDate(entry.updatedAt)} />
      </div>

      <div className="action-row">
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/edit`}
          className="btn"
        >
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
    </div>
  )
}
