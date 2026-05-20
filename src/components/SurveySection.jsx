import { useEffect, useMemo, useState } from 'react'
import {
  listSurveySetups,
  listSurveyShots,
  createSurveySetup,
  updateSurveySetup,
  deleteSurveySetup,
  createSurveyShot,
  updateSurveyShot,
  deleteSurveyShot,
  computeAllSetups
} from '../firebase/survey.js'
import SurveySetupCard from './SurveySetupCard.jsx'

export default function SurveySection({ jobId, dailyEntryId }) {
  const [setups, setSetups] = useState([])
  const [shotsBySetupId, setShotsBySetupId] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [isAddingSetup, setIsAddingSetup] = useState(false)
  const [newSetupName, setNewSetupName] = useState('')
  const [newSetupBM, setNewSetupBM] = useState('')
  const [isSavingSetup, setIsSavingSetup] = useState(false)
  const [addError, setAddError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const fetchedSetups = await listSurveySetups(dailyEntryId)
        if (cancelled) return
        const shotsArr = await Promise.all(
          fetchedSetups.map((s) => listSurveyShots(s.id))
        )
        if (cancelled) return
        const bucket = {}
        fetchedSetups.forEach((s, i) => {
          bucket[s.id] = shotsArr[i]
        })
        setSetups(fetchedSetups)
        setShotsBySetupId(bucket)
      } catch (err) {
        console.error('Failed to load survey data:', err)
        if (!cancelled) setLoadError('Failed to load survey data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dailyEntryId])

  const computed = useMemo(
    () => computeAllSetups(setups, shotsBySetupId),
    [setups, shotsBySetupId]
  )

  function startAddSetup() {
    setNewSetupName(`Setup ${setups.length + 1}`)
    setNewSetupBM('')
    setIsAddingSetup(true)
    setAddError(null)
  }

  function cancelAddSetup() {
    setIsAddingSetup(false)
    setAddError(null)
  }

  async function saveAddSetup() {
    let bm = null
    if (newSetupBM.trim() !== '') {
      bm = Number(newSetupBM)
      if (!Number.isFinite(bm)) {
        setAddError('Invalid benchmark elevation.')
        return
      }
    }
    if (setups.length === 0 && bm == null) {
      setAddError('First setup must include a benchmark elevation.')
      return
    }
    setIsSavingSetup(true)
    setAddError(null)
    try {
      const id = await createSurveySetup({
        jobId,
        dailyEntryId,
        setupName: newSetupName,
        initialBenchmarkElevation: bm
      })
      // Re-fetch to pick up server-side createdAt for stable ordering.
      const refreshed = await listSurveySetups(dailyEntryId)
      setSetups(refreshed)
      setShotsBySetupId((prev) => ({ ...prev, [id]: prev[id] || [] }))
      setIsAddingSetup(false)
      setNewSetupName('')
      setNewSetupBM('')
    } catch (err) {
      console.error('Failed to create setup:', err)
      setAddError('Failed to create setup')
    } finally {
      setIsSavingSetup(false)
    }
  }

  async function handleUpdateSetup(setupId, patch) {
    await updateSurveySetup(setupId, patch)
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? {
              ...s,
              setupName: patch.setupName ?? s.setupName,
              initialBenchmarkElevation: patch.initialBenchmarkElevation
            }
          : s
      )
    )
  }

  async function handleDeleteSetup(setupId) {
    await deleteSurveySetup(setupId)
    setSetups((prev) => prev.filter((s) => s.id !== setupId))
    setShotsBySetupId((prev) => {
      const next = { ...prev }
      delete next[setupId]
      return next
    })
  }

  async function handleAddShot(setupId, fields) {
    const id = await createSurveyShot({
      jobId,
      dailyEntryId,
      surveySetupId: setupId,
      ...fields
    })
    // Mirror the shape that mapShot would produce when this doc is
    // re-fetched. Without these pipe fields, a freshly added pipe
    // FS shot would render as non-pipe until a hard reload, with
    // labels missing and no derived obvert/invert.
    const isPipe = fields.type === 'FS' && fields.isPipe === true
    const newShot = {
      id,
      jobId,
      dailyEntryId,
      surveySetupId: setupId,
      type: fields.type,
      rodReading: fields.rodReading,
      description: fields.description || '',
      orderIndex: fields.orderIndex,
      isPipe,
      pipeMode: isPipe ? (fields.pipeMode || 'invert') : 'invert',
      pipeDiameter: isPipe ? (fields.pipeDiameter ?? null) : null
    }
    setShotsBySetupId((prev) => ({
      ...prev,
      [setupId]: [...(prev[setupId] || []), newShot]
    }))
  }

  async function handleUpdateShot(shotId, patch) {
    await updateSurveyShot(shotId, patch)
    setShotsBySetupId((prev) => {
      const next = { ...prev }
      for (const setupId of Object.keys(next)) {
        next[setupId] = next[setupId].map((s) =>
          s.id === shotId ? { ...s, ...patch } : s
        )
      }
      return next
    })
  }

  async function handleDeleteShot(shotId) {
    await deleteSurveyShot(shotId)
    setShotsBySetupId((prev) => {
      const next = { ...prev }
      for (const setupId of Object.keys(next)) {
        next[setupId] = next[setupId].filter((s) => s.id !== shotId)
      }
      return next
    })
  }

  return (
    <section className="stack survey-section">
      {isLoading && <p className="text-muted">Loading survey data…</p>}

      {loadError && !isLoading && (
        <div className="card error-card">
          <p>{loadError}</p>
        </div>
      )}

      {!isLoading && !loadError && setups.length === 0 && !isAddingSetup && (
        <p className="text-muted">
          No setups yet — add a setup to start recording shots.
        </p>
      )}

      {!isLoading &&
        !loadError &&
        setups.map((setup) => (
          <SurveySetupCard
            key={setup.id}
            setup={setup}
            computed={computed[setup.id]}
            onUpdateSetup={handleUpdateSetup}
            onDeleteSetup={handleDeleteSetup}
            onAddShot={handleAddShot}
            onUpdateShot={handleUpdateShot}
            onDeleteShot={handleDeleteShot}
          />
        ))}

      {isAddingSetup ? (
        <div className="card survey-setup">
          <div className="survey-setup__edit">
            <label className="field">
              <span className="field__label">Setup name</span>
              <input
                type="text"
                className="input"
                value={newSetupName}
                onChange={(e) => setNewSetupName(e.target.value)}
                disabled={isSavingSetup}
              />
            </label>
            <label className="field">
              <span className="field__label">Initial benchmark elevation</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                className="input"
                placeholder={
                  setups.length > 0
                    ? '(blank auto-chains from previous TP)'
                    : 'Required'
                }
                value={newSetupBM}
                onChange={(e) => setNewSetupBM(e.target.value)}
                disabled={isSavingSetup}
              />
            </label>
            {addError && <p className="form__error">{addError}</p>}
            <div className="survey-setup__actions">
              <button
                type="button"
                className="btn"
                onClick={saveAddSetup}
                disabled={isSavingSetup}
              >
                {isSavingSetup ? 'Saving…' : 'Create setup'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={cancelAddSetup}
                disabled={isSavingSetup}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        !isLoading &&
        !loadError && (
          <button type="button" className="btn" onClick={startAddSetup}>
            Add setup
          </button>
        )
      )}
    </section>
  )
}
