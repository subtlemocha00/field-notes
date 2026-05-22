import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../utils/AuthContext.jsx'
import {
  listJobDocuments,
  uploadJobDocument,
  deleteJobDocument,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_GROUP_LABELS
} from '../firebase/documents.js'
import { formatDate } from '../utils/format.js'
import DocumentUploader from './DocumentUploader.jsx'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function DocumentsSection({ jobId }) {
  const { user } = useAuth()

  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const result = await listJobDocuments(jobId)
        if (!cancelled) setDocuments(result)
      } catch (err) {
        console.error('Failed to load documents:', err)
        if (!cancelled) setLoadError('Failed to load documents.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [jobId])

  const grouped = useMemo(() => {
    const map = {}
    for (const type of DOCUMENT_TYPES) map[type] = []
    for (const document of documents) {
      const bucket = map[document.documentType] || (map[document.documentType] = [])
      bucket.push(document)
    }
    return map
  }, [documents])

  async function handleUpload({ file, documentType }) {
    const created = await uploadJobDocument({ file, jobId, documentType, user })
    setDocuments((prev) => [created, ...prev])
  }

  async function handleDelete(document) {
    if (!confirm(`Delete "${document.fileName}"? This cannot be undone.`)) {
      return
    }
    setPendingDeleteId(document.id)
    try {
      await deleteJobDocument(document)
      setDocuments((prev) => prev.filter((d) => d.id !== document.id))
    } catch (err) {
      console.error('Failed to delete document:', err)
      alert('Could not delete document. Please try again.')
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <section className="stack">
      <DocumentUploader onUpload={handleUpload} />

      {isLoading && <p className="text-muted">Loading documents…</p>}

      {loadError && !isLoading && (
        <div className="card error-card">
          <p>{loadError}</p>
        </div>
      )}

      {!isLoading && !loadError && documents.length === 0 && (
        <p className="text-muted">No documents yet — upload the first PDF above.</p>
      )}

      {!isLoading && !loadError && documents.length > 0 && (
        <div className="documents-groups">
          {DOCUMENT_TYPES.map((type) => {
            const items = grouped[type] || []
            if (items.length === 0) return null
            return (
              <div key={type} className="documents-group">
                <h3 className="documents-group__title">
                  {DOCUMENT_TYPE_GROUP_LABELS[type]}
                </h3>
                <ul className="documents-list">
                  {items.map((document) => {
                    const isPending = pendingDeleteId === document.id
                    return (
                      <li key={document.id} className="document-row">
                        <a
                          className="document-row__link"
                          href={document.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="document-row__name">
                            {document.fileName}
                          </span>
                          <span className="document-row__meta">
                            {formatDate(document.uploadedAt)}
                            {document.fileSize ? ` · ${formatSize(document.fileSize)}` : ''}
                          </span>
                        </a>
                        <button
                          type="button"
                          className="btn btn--danger document-row__delete"
                          onClick={() => handleDelete(document)}
                          disabled={isPending}
                          aria-label={`Delete ${document.fileName}`}
                        >
                          {isPending ? 'Deleting…' : 'Delete'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
