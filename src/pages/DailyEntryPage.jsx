import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import JSZip from 'jszip'
import { getDailyEntry } from '../firebase/dailyEntries.js'
import { listFieldNotes } from '../firebase/fieldNotes.js'
import { getJob } from '../firebase/jobs.js'
import { formatDateString } from '../utils/format.js'

function sanitizeFilename(name) {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'file'
}

// Firebase Storage URLs encode the full path in the URL pathname.
// Decoding it and taking the last segment yields the original filename.
function extractFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    const decoded = decodeURIComponent(pathname)
    const parts = decoded.split('/')
    const name = parts[parts.length - 1]
    return name || null
  } catch {
    return null
  }
}

export default function DailyEntryPage() {
  const { jobId, dailyEntryId } = useParams()

  const [entry, setEntry] = useState(null)
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [allPhotoUrls, setAllPhotoUrls] = useState([])
  const [isZipping, setIsZipping] = useState(false)
  const [zipError, setZipError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [result, jobResult, notes] = await Promise.all([
          getDailyEntry(dailyEntryId),
          getJob(jobId),
          listFieldNotes(dailyEntryId)
        ])
        if (cancelled) return
        if (!result) {
          setError('Daily entry not found.')
        } else {
          setEntry(result)
          setJob(jobResult)
          const urls = notes.flatMap(n => n.photoUrls).filter(Boolean)
          setAllPhotoUrls(urls)
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
  }, [dailyEntryId, jobId])

  const handleDownloadPhotos = useCallback(async () => {
    if (allPhotoUrls.length === 0 || isZipping) return
    setIsZipping(true)
    setZipError(null)

    try {
      const zip = new JSZip()

      const results = await Promise.allSettled(
        allPhotoUrls.map(async (url, index) => {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const blob = await response.blob()
          const rawExt = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
          const rawName = extractFilenameFromUrl(url)
          const baseName = rawName
            ? sanitizeFilename(rawName)
            : `photo_${String(index + 1).padStart(3, '0')}.${rawExt}`
          // Prefix with index to guarantee uniqueness across all notes
          const filename = `${String(index + 1).padStart(3, '0')}_${baseName}`
          return { filename, blob }
        })
      )

      let added = 0
      for (const result of results) {
        if (result.status === 'fulfilled') {
          zip.file(result.value.filename, result.value.blob)
          added++
        } else {
          console.warn('Photo fetch failed, skipping:', result.reason)
        }
      }

      if (added === 0) {
        throw new Error('No photos could be downloaded.')
      }

      const jobNumber = job?.jobNumber || jobId
      const zipName = sanitizeFilename(`${jobNumber}_${entry.date}_Photos`) + '.zip'

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const objectUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = zipName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('ZIP generation failed:', err)
      setZipError('Failed to prepare ZIP. Please try again.')
    } finally {
      setIsZipping(false)
    }
  }, [allPhotoUrls, isZipping, job, entry, jobId])

  if (isLoading) {
    return <p className="text-muted">Loading…</p>
  }

  if (error) {
    return (
      <div className="stack">
        <div className="card error-card">
          <p>{error}</p>
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
        <Link to={`/jobs/${jobId}`} className="back-link">← Back to job</Link>
      </div>

      <div className="page-title-row">
        <h1>
          <span className="job-detail__number">Daily entry</span>
          <span className="job-detail__name">{formatDateString(entry.date)}</span>
        </h1>
      </div>

      {entry.contractor && (
        <p className="entry-hub-meta">{entry.contractor}</p>
      )}

      <nav className="entry-hub-nav">
        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/summary`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📋</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Summary</span>
            <span className="entry-hub-card__desc">Contractor · weather · crew · equipment</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>

        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/notes`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📝</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Field Notes</span>
            <span className="entry-hub-card__desc">Notes · photos · timestamps</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>

        <Link
          to={`/jobs/${jobId}/daily/${dailyEntryId}/survey`}
          className="entry-hub-card"
        >
          <span className="entry-hub-card__icon">📐</span>
          <div className="entry-hub-card__body">
            <span className="entry-hub-card__title">Survey / Level Book</span>
            <span className="entry-hub-card__desc">Setups · shots · elevations</span>
          </div>
          <span className="entry-hub-card__arrow">›</span>
        </Link>
      </nav>

      {allPhotoUrls.length > 0 && (
        <div className="entry-hub-actions">
          <button
            className="btn btn--secondary entry-hub-download-btn"
            onClick={handleDownloadPhotos}
            disabled={isZipping}
          >
            {isZipping
              ? 'Preparing ZIP…'
              : `Download Daily Photos (${allPhotoUrls.length})`}
          </button>
          {zipError && (
            <p className="entry-hub-download-error">{zipError}</p>
          )}
        </div>
      )}
    </div>
  )
}
