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
  const [isPipe, setIsPipe] = useState(!!shot.isPipe)
  const [pipeMode, setPipeMode] = useState(shot.pipeMode || 'invert')
  const [pipeDiameter, setPipeDiameter] = useState(
    shot.pipeDiameter != null ? String(shot.pipeDiameter) : ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setType(shot.type || 'FS')
    setRodReading(shot.rodReading != null ? String(shot.rodReading) : '')
    setDescription(shot.description || '')
    setIsPipe(!!shot.isPipe)
    setPipeMode(shot.pipeMode || 'invert')
    setPipeDiameter(shot.pipeDiameter != null ? String(shot.pipeDiameter) : '')
    setIsEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  // Pipe controls only apply to FS shots. Flipping away from FS
  // implicitly disables pipe so we never persist orphan pipe data.
  const effectiveIsPipe = type === 'FS' && isPipe

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
    let diameter = null
    if (effectiveIsPipe) {
      if (pipeMode === 'obvert') {
        if (!pipeDiameter.trim()) {
          setError('Pipe diameter is required for obvert mode.')
          return
        }
      }
      if (pipeDiameter.trim() !== '') {
        const d = Number(pipeDiameter)
        if (!Number.isFinite(d) || d <= 0) {
          setError('Pipe diameter must be a positive number.')
          return
        }
        diameter = d
      }
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(shot.id, {
        type,
        rodReading: num,
        description,
        isPipe: effectiveIsPipe,
        pipeMode: effectiveIsPipe ? pipeMode : 'invert',
        pipeDiameter: effectiveIsPipe ? diameter : null
      })
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

        {type === 'FS' && (
          <div className="pipe-controls">
            <label className="pipe-controls__toggle">
              <input
                type="checkbox"
                checked={isPipe}
                onChange={(e) => setIsPipe(e.target.checked)}
                disabled={isSaving}
              />
              <span>PIPE</span>
            </label>
            {isPipe && (
              <div className="pipe-controls__row">
                <select
                  className="input pipe-controls__mode"
                  value={pipeMode}
                  onChange={(e) => setPipeMode(e.target.value)}
                  disabled={isSaving}
                  aria-label="Pipe mode"
                >
                  <option value="invert">Invert</option>
                  <option value="obvert">Obvert</option>
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  className="input pipe-controls__diameter"
                  placeholder={
                    pipeMode === 'obvert'
                      ? 'Pipe diameter (required)'
                      : 'Pipe diameter (optional)'
                  }
                  value={pipeDiameter}
                  onChange={(e) => setPipeDiameter(e.target.value)}
                  disabled={isSaving}
                  aria-label="Pipe diameter"
                />
              </div>
            )}
          </div>
        )}

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
          <button
            type="button"
            className="btn btn--danger shot-row__btn"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
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
        <span className="shot-row__reading">
          <span className="shot-row__elev-label">ROD</span>
          <strong>{formatNumber(shot.rodReading)}</strong>
        </span>
        {shot.isPipe ? (
          <>
            <span className="shot-row__elev shot-row__elev--obvert">
              <span className="shot-row__elev-label">OBV</span>
              <strong>{formatNumber(shot.calculatedObvert)}</strong>
            </span>
            <span className="shot-row__elev shot-row__elev--invert">
              <span className="shot-row__elev-label">INV</span>
              <strong>{formatNumber(shot.calculatedInvert)}</strong>
            </span>
          </>
        ) : (
          <span className="shot-row__elev">
            <span className="shot-row__elev-label">ELEV</span>
            <strong>{formatNumber(shot.calculatedElevation)}</strong>
          </span>
        )}
        {shot._error && (
          <span className="shot-row__warn">{shot._error}</span>
        )}
      </div>
      {shot.description && (
        <div className="shot-row__desc-row">{shot.description}</div>
      )}
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
      </div>
    </li>
  )
}
