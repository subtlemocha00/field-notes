import { useState } from 'react'

export default function PhotoGallery({ urls, onDelete, disabled }) {
  const [activeUrl, setActiveUrl] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  if (!urls || urls.length === 0) {
    return null
  }

  async function handleDelete(url) {
    if (!confirm('Delete this photo?')) return
    setPendingDelete(url)
    try {
      await onDelete(url)
      if (activeUrl === url) setActiveUrl(null)
    } catch (err) {
      console.error('Photo delete failed:', err)
      alert('Could not delete photo')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="photo-gallery">
      <ul className="photo-grid">
        {urls.map((url) => {
          const isPending = pendingDelete === url
          return (
            <li key={url} className="photo-tile">
              <button
                type="button"
                className="photo-tile__btn"
                onClick={() => setActiveUrl(url)}
                aria-label="View photo"
              >
                <img
                  src={url}
                  alt="Field note photo"
                  loading="lazy"
                  className="photo-tile__img"
                />
              </button>
              <button
                type="button"
                className="btn btn--danger photo-tile__delete"
                onClick={() => handleDelete(url)}
                disabled={disabled || isPending}
                aria-label="Delete photo"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </li>
          )
        })}
      </ul>

      {activeUrl && (
        <div
          className="photo-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveUrl(null)}
        >
          <button
            type="button"
            className="photo-modal__close"
            onClick={() => setActiveUrl(null)}
            aria-label="Close photo viewer"
          >
            ×
          </button>
          <img
            src={activeUrl}
            alt="Field note photo"
            className="photo-modal__img"
          />
        </div>
      )}
    </div>
  )
}
