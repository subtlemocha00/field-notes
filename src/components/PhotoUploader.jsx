import { useRef, useState, useEffect } from 'react'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

// Extension fallback for Android camera captures that return empty file.type.
// The MIME check alone would silently reject valid camera photos on Android.
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif)$/i

function isImageFile(file) {
  if (file.type && file.type.startsWith('image/')) return true
  return IMAGE_EXT_RE.test(file.name || '')
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function PhotoUploader({ disabled, onUpload }) {
  const inputRef = useRef(null)
  // Track mount state so we never call setState after unmount (e.g. when the
  // user collapses the photos section while an upload is in flight).
  const mountedRef = useRef(true)
  const [isUploading, setIsUploading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState(null)
  // Keep the last failed File reference so the user can retry without
  // having to re-open the file picker.
  const [retryFile, setRetryFile] = useState(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function doUpload(file) {
    if (!mountedRef.current) return
    setIsUploading(true)
    setError(null)
    setRetryFile(null)
    setProgressLabel(`Uploading ${formatSize(file.size)}…`)
    try {
      await onUpload(file, (pct) => {
        if (mountedRef.current) setProgressLabel(`Uploading… ${pct}%`)
      })
    } catch (err) {
      console.error('Photo upload failed:', err)
      if (!mountedRef.current) return
      const code = err?.code ? ` (${err.code})` : ''
      setError(`Upload failed${code}. Please retry.`)
      setRetryFile(file)
    } finally {
      if (mountedRef.current) {
        setIsUploading(false)
        setProgressLabel('')
      }
    }
  }

  async function handleFileChange(event) {
    const input = event.target
    const file = input.files?.[0]
    // Reset the input immediately so the same file can be re-selected for
    // retry if this attempt fails.
    input.value = ''

    if (!file) {
      // Camera intent returned with no file (user cancelled, or the
      // Android Activity dropped the result). Nothing to do.
      return
    }

    if (!isImageFile(file)) {
      setError(`Not an image file (${file.type || 'unknown type'}).`)
      return
    }
    // Guard against 0-byte files returned by Android when memory pressure
    // caused the camera to produce an empty capture.
    if (file.size === 0) {
      setError('Photo could not be read (0 bytes). Please take the photo again.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${formatSize(file.size)}). Max 25 MB.`)
      return
    }

    await doUpload(file)
  }

  return (
    <div className="photo-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // capture="environment" intentionally omitted.
        // That attribute forces the Android camera Activity to open instead
        // of the native file picker, which causes silent upload failures when
        // Android reclaims memory while the camera is open. The browser's
        // own picker offers camera + gallery without the lifecycle risk.
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
          {retryFile && !isUploading && (
            <button
              type="button"
              className="photo-uploader__retry-btn"
              onClick={() => doUpload(retryFile)}
            >
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  )
}
