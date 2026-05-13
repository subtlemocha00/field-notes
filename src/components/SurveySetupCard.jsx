import { useState } from 'react'
import { SHOT_TYPES } from '../firebase/survey.js'
import SurveyShotRow from './SurveyShotRow.jsx'

function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(3)
}

export default function SurveySetupCard({
  setup,
  computed,
  onUpdateSetup,
  onDeleteSetup,
  onAddShot,
  onUpdateShot,
  onDeleteShot
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [setupName, setSetupName] = useState(setup.setupName || '')
  const [initialBM, setInitialBM] = useState(
    setup.initialBenchmarkElevation != null
      ? String(setup.initialBenchmarkElevation)
      : ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [setupError, setSetupError] = useState(null)

  const [isAddingShot, setIsAddingShot] = useState(false)
  const [draftType, setDraftType] = useState('FS')
  const [draftReading, setDraftReading] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftIsPipe, setDraftIsPipe] = useState(false)
  const [draftPipeMode, setDraftPipeMode] = useState('invert')
  const [draftPipeDiameter, setDraftPipeDiameter] = useState('')
  const [isSavingShot, setIsSavingShot] = useState(false)
  const [shotError, setShotError] = useState(null)

  const draftIsPipeEffective = draftType === 'FS' && draftIsPipe

  function startEdit() {
    setSetupName(setup.setupName || '')
    setInitialBM(
      setup.initialBenchmarkElevation != null
        ? String(setup.initialBenchmarkElevation)
        : ''
    )
    setIsEditing(true)
    setSetupError(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setSetupError(null)
  }

  async function saveEdit() {
    let bm = null
    if (initialBM.trim() !== '') {
      bm = Number(initialBM)
      if (!Number.isFinite(bm)) {
        setSetupError('Invalid benchmark elevation.')
        return
      }
    }
    setIsSaving(true)
    setSetupError(null)
    try {
      await onUpdateSetup(setup.id, {
        setupName,
        initialBenchmarkElevation: bm
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save setup:', err)
      setSetupError('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSetup() {
    if (
      !confirm(
        `Delete setup "${setup.setupName || 'Unnamed'}" and all its shots?`
      )
    ) {
      return
    }
    setIsDeleting(true)
    try {
      await onDeleteSetup(setup.id)
    } catch (err) {
      console.error('Failed to delete setup:', err)
      alert('Failed to delete setup')
      setIsDeleting(false)
    }
  }

  function startAddShot() {
    setDraftType(computed.shots.length === 0 ? 'BS' : 'FS')
    setDraftReading('')
    setDraftDesc('')
    setDraftIsPipe(false)
    setDraftPipeMode('invert')
    setDraftPipeDiameter('')
    setIsAddingShot(true)
    setShotError(null)
  }

  function cancelAddShot() {
    setIsAddingShot(false)
    setShotError(null)
  }

  async function saveAddShot() {
    if (!draftReading.trim()) {
      setShotError('Rod reading required.')
      return
    }
    const num = Number(draftReading)
    if (!Number.isFinite(num)) {
      setShotError('Invalid rod reading.')
      return
    }
    let diameter = null
    if (draftIsPipeEffective) {
      if (draftPipeMode === 'obvert' && !draftPipeDiameter.trim()) {
        setShotError('Pipe diameter is required for obvert mode.')
        return
      }
      if (draftPipeDiameter.trim() !== '') {
        const d = Number(draftPipeDiameter)
        if (!Number.isFinite(d) || d <= 0) {
          setShotError('Pipe diameter must be a positive number.')
          return
        }
        diameter = d
      }
    }
    setIsSavingShot(true)
    setShotError(null)
    try {
      const maxIndex =
        computed.shots.length > 0
          ? Math.max(...computed.shots.map((s) => s.orderIndex ?? 0))
          : -1
      await onAddShot(setup.id, {
        type: draftType,
        rodReading: num,
        description: draftDesc,
        orderIndex: maxIndex + 1,
        isPipe: draftIsPipeEffective,
        pipeMode: draftIsPipeEffective ? draftPipeMode : 'invert',
        pipeDiameter: draftIsPipeEffective ? diameter : null
      })
      setIsAddingShot(false)
      setDraftReading('')
      setDraftDesc('')
      setDraftIsPipe(false)
      setDraftPipeMode('invert')
      setDraftPipeDiameter('')
    } catch (err) {
      console.error('Failed to add shot:', err)
      setShotError('Failed to add shot')
    } finally {
      setIsSavingShot(false)
    }
  }

  return (
    <div className="card survey-setup">
      <header className="survey-setup__header">
        {!isEditing ? (
          <>
            <h3 className="survey-setup__name">
              {setup.setupName || 'Unnamed setup'}
            </h3>
            <div className="survey-setup__meta">
              <span>
                BM elev:{' '}
                <strong>{formatNumber(computed.startingElevation)}</strong>
                {setup.initialBenchmarkElevation == null && (
                  <span className="text-muted"> (auto-chained)</span>
                )}
              </span>
              <span>
                HI: <strong>{formatNumber(computed.currentHI)}</strong>
              </span>
            </div>
          </>
        ) : (
          <div className="survey-setup__edit">
            <label className="field">
              <span className="field__label">Setup name</span>
              <input
                type="text"
                className="input"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                disabled={isSaving}
              />
            </label>
            <label className="field">
              <span className="field__label">Initial benchmark elevation</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                className="input"
                placeholder="(blank auto-chains from previous TP)"
                value={initialBM}
                onChange={(e) => setInitialBM(e.target.value)}
                disabled={isSaving}
              />
            </label>
            {setupError && <p className="form__error">{setupError}</p>}
          </div>
        )}
      </header>

      <div className="survey-setup__actions">
        {!isEditing ? (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={startEdit}
            disabled={isDeleting}
          >
            Edit setup
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              onClick={saveEdit}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={cancelEdit}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleDeleteSetup}
              disabled={isDeleting || isSaving}
            >
              {isDeleting ? 'Deleting…' : 'Delete setup'}
            </button>
          </>
        )}
      </div>

      {computed.shots.length === 0 && !isAddingShot && (
        <p className="text-muted">
          No shots yet — add a backsight (BS) to define the HI.
        </p>
      )}

      {(computed.shots.length > 0 || isAddingShot) && (
        <ul className="shot-list">
          {computed.shots.map((shot) => (
            <SurveyShotRow
              key={shot.id}
              shot={shot}
              onSave={onUpdateShot}
              onDelete={onDeleteShot}
            />
          ))}
          {isAddingShot && (
            <li className="shot-row shot-row--edit">
              <div className="shot-row__inputs">
                <select
                  className="input shot-row__type-input"
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  disabled={isSavingShot}
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
                  value={draftReading}
                  onChange={(e) => setDraftReading(e.target.value)}
                  disabled={isSavingShot}
                  aria-label="Rod reading"
                  autoFocus
                />
                <input
                  type="text"
                  className="input shot-row__desc-input"
                  placeholder="Description"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  disabled={isSavingShot}
                  aria-label="Description"
                />
              </div>

              {draftType === 'FS' && (
                <div className="pipe-controls">
                  <label className="pipe-controls__toggle">
                    <input
                      type="checkbox"
                      checked={draftIsPipe}
                      onChange={(e) => setDraftIsPipe(e.target.checked)}
                      disabled={isSavingShot}
                    />
                    <span>PIPE</span>
                  </label>
                  {draftIsPipe && (
                    <div className="pipe-controls__row">
                      <select
                        className="input pipe-controls__mode"
                        value={draftPipeMode}
                        onChange={(e) => setDraftPipeMode(e.target.value)}
                        disabled={isSavingShot}
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
                          draftPipeMode === 'obvert'
                            ? 'Pipe diameter (required)'
                            : 'Pipe diameter (optional)'
                        }
                        value={draftPipeDiameter}
                        onChange={(e) => setDraftPipeDiameter(e.target.value)}
                        disabled={isSavingShot}
                        aria-label="Pipe diameter"
                      />
                    </div>
                  )}
                </div>
              )}

              {shotError && <p className="form__error">{shotError}</p>}
              <div className="shot-row__actions">
                <button
                  type="button"
                  className="btn shot-row__btn"
                  onClick={saveAddShot}
                  disabled={isSavingShot || !draftReading.trim()}
                >
                  {isSavingShot ? 'Saving…' : 'Add shot'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary shot-row__btn"
                  onClick={cancelAddShot}
                  disabled={isSavingShot}
                >
                  Cancel
                </button>
              </div>
            </li>
          )}
        </ul>
      )}

      {!isAddingShot && (
        <button
          type="button"
          className="btn btn--secondary survey-setup__add-shot"
          onClick={startAddShot}
          disabled={isDeleting}
        >
          Add shot
        </button>
      )}
    </div>
  )
}
