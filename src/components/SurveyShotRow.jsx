import { useState } from 'react'
import { SHOT_TYPES } from '../firebase/survey.js'

function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(3)
}

export default function SurveyShotRow({ shot, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [type, setType] = useState(shot.type || 'FS')
  const [rodReading, setRodReading] = useState(
    shot.rodReading != null ? String(shot.rodReading) : ''
  )
  const [description, setDescription] = useState(shot.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setType(shot.type || 'FS')
    setRodReading(shot.rodReading != null ? String(shot.rodReading) : '')
    setDescription(shot.description || '')
    setIsEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  async function saveEdit() {
    if (!rodReading.trim()) {
      setError('Rod reading required.')
      return
    }
    const num = Number(rodReading)
    if (!Number.isFinite(num)) {
      setError('Invalid rod reading.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(shot.id, { type, rodReading: num, description })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save shot:', err)
      setError('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this shot?')) return
    setIsDeleting(true)
    try {
      await onDelete(shot.id)
    } catch (err) {
      console.error('Failed to delete shot:', err)
      setError('Failed to delete')
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <li className="shot-row shot-row--edit">
        <div className="shot-row__inputs">
          <select
            className="input shot-row__type-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isSaving}
            aria-label="Shot type"
          >
            {SHOT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            className="input shot-row__reading-input"
            placeholder="Rod reading"
            value={rodReading}
            onChange={(e) => setRodReading(e.target.value)}
            disabled={isSaving}
            aria-label="Rod reading"
          />
          <input
            type="text"
            className="input shot-row__desc-input"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            aria-label="Description"
          />
        </div>
        {error && <p className="form__error">{error}</p>}
        <div className="shot-row__actions">
          <button
            type="button"
            className="btn shot-row__btn"
            onClick={saveEdit}
            disabled={isSaving || !rodReading.trim()}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn--secondary shot-row__btn"
            onClick={cancelEdit}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="shot-row">
      <div className="shot-row__display">
        <span className={`shot-row__type-badge shot-row__type-badge--${shot.type}`}>
          {shot.type}
        </span>
        <span className="shot-row__reading">{formatNumber(shot.rodReading)}</span>
        <span className="shot-row__elev">
          Elev: <strong>{formatNumber(shot.calculatedElevation)}</strong>
        </span>
        {shot.description && (
          <span className="shot-row__desc">{shot.description}</span>
        )}
        {shot._error && (
          <span className="shot-row__warn">{shot._error}</span>
        )}
      </div>
      {error && <p className="form__error">{error}</p>}
      <div className="shot-row__actions">
        <button
          type="button"
          className="btn btn--secondary shot-row__btn"
          onClick={startEdit}
          disabled={isDeleting}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn--danger shot-row__btn"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}
