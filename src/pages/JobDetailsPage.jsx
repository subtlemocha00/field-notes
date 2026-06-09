import { useState, useEffect } from 'react'
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

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const { user } = useAuth()

  const [job, setJob] = useState(null)
  const [roadMakeup, setRoadMakeup] = useState(EMPTY_ROAD_MAKEUP)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

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
        if (detailsResult?.roadMakeup) {
          setRoadMakeup(detailsResult.roadMakeup)
        }
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
    setSaved(false)
    setRoadMakeup((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await saveRoadMakeup(jobId, roadMakeup, user)
      setSaved(true)
    } catch (err) {
      console.error('Failed to save road makeup:', err)
      setSaveError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

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

      <div className="section-header">
        <h2>Road Makeup</h2>
      </div>

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
        {saved && <span className="rd-saved">Saved</span>}
        {saveError && <p className="form__error rd-actions__error">{saveError}</p>}
      </div>

    </div>
  )
}
