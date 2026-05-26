import { useRef, useState } from 'react'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  MAX_DOCUMENT_BYTES
} from '../firebase/documents.js'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// PDF detection: most browsers report 'application/pdf', but some Android
// pickers return an empty type. Fall back to a case-insensitive extension
// check so legitimate PDFs are not rejected.
function isPdf(file) {
  if (file.type === 'application/pdf') return true
  const name = (file.name || '').toLowerCase()
  return name.endsWith('.pdf')
}

export default function DocumentUploader({ disabled, onUpload }) {
  const inputRef = useRef(null)
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [isUploading, setIsUploading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState(null)

  async function handleFileChange(event) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (!isPdf(file)) {
      setError(`Only PDF files are allowed (${file.type || 'unknown type'}).`)
      input.value = ''
      return
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`File is too large (${formatSize(file.size)}). Max 50 MB.`)
      input.value = ''
      return
    }

    setIsUploading(true)
    setError(null)
    setProgressLabel(`Uploading ${formatSize(file.size)}…`)
    try {
      await onUpload({ file, documentType })
    } catch (err) {
      console.error('Document upload failed:', err)
      const code = err?.code ? ` (${err.code})` : ''
      setError(`Upload failed${code}. Tap “Upload PDF” to retry.`)
    } finally {
      setIsUploading(false)
      setProgressLabel('')
      input.value = ''
    }
  }

  return (
    <div className="doc-uploader">
      <div className="field doc-uploader__type">
        <label className="field__label" htmlFor="doc-uploader-type">
          Document type
        </label>
        <select
          id="doc-uploader-type"
          className="input"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={disabled || isUploading}
        >
          {DOCUMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="visually-hidden"
        aria-label="PDF file"
      />
      <button
        type="button"
        className="btn doc-uploader__btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? progressLabel || 'Uploading…' : 'Upload PDF'}
      </button>

      {error && (
        <p className="form__error doc-uploader__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
