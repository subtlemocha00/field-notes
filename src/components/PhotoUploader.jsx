import { useRef, useState } from 'react'

export default function PhotoUploader({ disabled, onUpload }) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed')
    } finally {
      setIsUploading(false)
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
        {isUploading ? 'Uploading…' : 'Add photo'}
      </button>
      {error && <p className="form__error">{error}</p>}
    </div>
  )
}
