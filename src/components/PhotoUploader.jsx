import { useRef, useState } from 'react'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function PhotoUploader({ disabled, onUpload }) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState(null)

  async function handleFileChange(event) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) {
      // Camera intent returned with no file (user cancelled, or the
      // Android Activity dropped the result). Nothing to do.
      return
    }

    if (!file.type || !file.type.startsWith('image/')) {
      setError(`Not an image file (${file.type || 'unknown type'}).`)
      input.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${formatSize(file.size)}). Max 25 MB.`)
      input.value = ''
      return
    }

    setIsUploading(true)
    setError(null)
    setProgressLabel(`Uploading ${formatSize(file.size)}…`)
    try {
      await onUpload(file)
    } catch (err) {
      // Surface the real Firebase error so it's debuggable in the field
      // (via eruda or browser devtools). The on-screen message stays
      // user-readable but includes the underlying code when available.
      console.error('Photo upload failed:', err)
      const code = err?.code ? ` (${err.code})` : ''
      setError(`Upload failed${code}. Tap “Add photo” to retry.`)
    } finally {
      setIsUploading(false)
      setProgressLabel('')
      // Reset only after the upload finishes so re-picking the same file
      // works, but the camera intent's File reference stays valid while
      // the upload is in flight.
      input.value = ''
    }
  }

  return (
    <div className="photo-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="visually-hidden"
        aria-label="Photo file"
      />
      <button
        type="button"
        className="btn btn--secondary photo-uploader__btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? progressLabel || 'Uploading…' : 'Add photo'}
      </button>
      {error && (
        <p className="form__error photo-uploader__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
