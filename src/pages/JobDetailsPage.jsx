import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getJob } from '../firebase/jobs.js'
import { getJobDetails, saveRoadMakeup } from '../firebase/jobDetails.js'
import { useAuth } from '../utils/AuthContext.jsx'

const EMPTY_ROAD_MAKEUP = {
  topAsphaltType: '',
  topAsphaltThickness: '',
  baseAsphaltType: '',
  baseAsphaltThickness: '',
  granularAThickness: '',
  granularBThickness: '',
}

// True if any field has a non-empty trimmed value.
function hasRoadMakeupData(rm) {
  return Object.values(rm).some((v) => (v || '').trim() !== '')
}

// "HL-3 — 40 mm", or just "HL-3", or just "40 mm", or "—".
function asphaltDisplay(type, thickness) {
  const parts = []
  if ((type || '').trim()) parts.push(type.trim())
  if ((thickness || '').trim()) parts.push(`${thickness.trim()} mm`)
  return parts.join(' — ') || '—'
}

// "150 mm" or "—".
function thicknessDisplay(thickness) {
  const t = (thickness || '').trim()
  return t ? `${t} mm` : '—'
}

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const { user } = useAuth()

  const [job, setJob] = useState(null)
  const [roadMakeup, setRoadMakeup] = useState(EMPTY_ROAD_MAKEUP)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Holds the last-persisted values so Cancel can revert unsaved edits.
  // A ref avoids a re-render on snapshot capture.
  const savedSnapshotRef = useRef(EMPTY_ROAD_MAKEUP)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [jobResult, detailsResult] = await Promise.all([
          getJob(jobId),
          getJobDetails(jobId),
        ])
        if (cancelled) return
        if (!jobResult) {
          setLoadError('Job not found.')
          return
        }
        setJob(jobResult)
        const rm = detailsResult?.roadMakeup ?? EMPTY_ROAD_MAKEUP
        savedSnapshotRef.current = rm
        setRoadMakeup(rm)
        // No saved data → open the form immediately so the user can fill it in.
        setIsEditing(!hasRoadMakeupData(rm))
      } catch (err) {
        console.error('Failed to load job details:', err)
        if (!cancelled) setLoadError('Failed to load job details.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [jobId])

  function handleChange(field, value) {
    setRoadMakeup((prev) => ({ ...prev, [field]: value }))
  }

  function handleStartEdit() {
    // Capture the current display values as the cancel target.
    savedSnapshotRef.current = { ...roadMakeup }
    setSaveError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setRoadMakeup(savedSnapshotRef.current)
    setSaveError(null)
    setIsEditing(false)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const trimmed = {
        topAsphaltType: (roadMakeup.topAsphaltType || '').trim(),
        topAsphaltThickness: (roadMakeup.topAsphaltThickness || '').trim(),
        baseAsphaltType: (roadMakeup.baseAsphaltType || '').trim(),
        baseAsphaltThickness: (roadMakeup.baseAsphaltThickness || '').trim(),
        granularAThickness: (roadMakeup.granularAThickness || '').trim(),
        granularBThickness: (roadMakeup.granularBThickness || '').trim(),
      }
      await saveRoadMakeup(jobId, trimmed, user)
      savedSnapshotRef.current = trimmed
      setRoadMakeup(trimmed)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save road makeup:', err)
      setSaveError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Loading / error gates ──────────────────────────────────

  if (isLoading) {
    return <p className="text-muted">Loading…</p>
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

  // ── Page ──────────────────────────────────────────────────

  return (
    <div className="stack">

      <div>
        <Link to={`/jobs/${jobId}`} className="back-link">
          ← Back to job
        </Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">{job.jobNumber}</span>
          <span className="job-detail__name">Job Details</span>
        </h1>
      </div>

      {/* Section header — Edit button lives here in view mode so the
          rule fills naturally when the form is open.               */}
      <div className="section-header">
        <h2>Road Makeup</h2>
        {!isEditing && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleStartEdit}
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (

        /* ── EDIT STATE ─────────────────────────────────────── */
        <>
          <div className="card stack">

            <div className="rd-layer">
              <div className="rd-layer__name">Top Asphalt</div>
              <div className="field">
                <label className="field__label">Type</label>
                <input
                  className="input"
                  type="text"
                  value={roadMakeup.topAsphaltType}
                  onChange={(e) => handleChange('topAsphaltType', e.target.value)}
                  placeholder="e.g. HL-3"
                  disabled={isSaving}
                />
              </div>
              <div className="field">
                <label className="field__label">Thickness</label>
                <div className="rd-mm-row">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={roadMakeup.topAsphaltThickness}
                    onChange={(e) => handleChange('topAsphaltThickness', e.target.value)}
                    placeholder="0"
                    disabled={isSaving}
                  />
                  <span className="rd-mm-unit">mm</span>
                </div>
              </div>
            </div>

            <div className="rd-layer">
              <div className="rd-layer__name">Base Asphalt</div>
              <div className="field">
                <label className="field__label">Type</label>
                <input
                  className="input"
                  type="text"
                  value={roadMakeup.baseAsphaltType}
                  onChange={(e) => handleChange('baseAsphaltType', e.target.value)}
                  placeholder="e.g. HL-4"
                  disabled={isSaving}
                />
              </div>
              <div className="field">
                <label className="field__label">Thickness</label>
                <div className="rd-mm-row">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={roadMakeup.baseAsphaltThickness}
                    onChange={(e) => handleChange('baseAsphaltThickness', e.target.value)}
                    placeholder="0"
                    disabled={isSaving}
                  />
                  <span className="rd-mm-unit">mm</span>
                </div>
              </div>
            </div>

            <div className="rd-layer">
              <div className="rd-layer__name">Granular A</div>
              <div className="field">
                <label className="field__label">Thickness</label>
                <div className="rd-mm-row">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={roadMakeup.granularAThickness}
                    onChange={(e) => handleChange('granularAThickness', e.target.value)}
                    placeholder="0"
                    disabled={isSaving}
                  />
                  <span className="rd-mm-unit">mm</span>
                </div>
              </div>
            </div>

            <div className="rd-layer">
              <div className="rd-layer__name">Granular B</div>
              <div className="field">
                <label className="field__label">Thickness</label>
                <div className="rd-mm-row">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={roadMakeup.granularBThickness}
                    onChange={(e) => handleChange('granularBThickness', e.target.value)}
                    placeholder="0"
                    disabled={isSaving}
                  />
                  <span className="rd-mm-unit">mm</span>
                </div>
              </div>
            </div>

          </div>

          <div className="rd-actions">
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            {/* Cancel only shown when there are saved values to revert to. */}
            {hasRoadMakeupData(savedSnapshotRef.current) && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
            )}
            {saveError && (
              <p className="form__error rd-actions__error">{saveError}</p>
            )}
          </div>
        </>

      ) : (

        /* ── VIEW STATE ─────────────────────────────────────── */
        <div className="card stack">
          <div className="detail-row">
            <div className="detail-row__label">Top Asphalt</div>
            <div className="detail-row__value">
              {asphaltDisplay(roadMakeup.topAsphaltType, roadMakeup.topAsphaltThickness)}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row__label">Base Asphalt</div>
            <div className="detail-row__value">
              {asphaltDisplay(roadMakeup.baseAsphaltType, roadMakeup.baseAsphaltThickness)}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row__label">Granular A</div>
            <div className="detail-row__value">
              {thicknessDisplay(roadMakeup.granularAThickness)}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row__label">Granular B</div>
            <div className="detail-row__value">
              {thicknessDisplay(roadMakeup.granularBThickness)}
            </div>
          </div>
        </div>

      )}

    </div>
  )
}
