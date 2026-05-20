import { useState } from 'react'
import { formatTimestamp } from '../utils/format.js'
import {
  uploadFieldNotePhoto,
  deleteFieldNotePhoto
} from '../firebase/photos.js'
import { timeStringToTimestamp } from '../firebase/fieldNotes.js'
import PhotoUploader from './PhotoUploader.jsx'
import PhotoGallery from './PhotoGallery.jsx'

// "HH:MM" display (24-hour) from Firestore Timestamp or Date.
function shortTime(value) {
  if (!value) return ''
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// "HH:MM" string compatible with <input type="time">.
function toTimeInput(value) {
  if (!value) return ''
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FieldNoteItem({
  note,
  onUpdate,
  onDelete,
  onPhotosChanged,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(note.text)
  const [editTime, setEditTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  // Photos collapsed by default — reduces visual clutter when many notes exist.
  const [isPhotosOpen, setIsPhotosOpen] = useState(false)

  const photoCount = note.photoUrls?.length ?? 0

  // ── Handlers ─────────────────────────────────────────────────

  function startEdit() {
    setEditText(note.text)
    setEditTime(toTimeInput(note.timestamp))
    setIsEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  async function saveEdit() {
    const next = editText.trim()
    if (!next) {
      setError('Note cannot be empty.')
      return
    }

    // Build updated timestamp from editTime, preserving the original calendar
    // date — only the time-of-day portion changes.
    let nextTimestamp = null
    if (editTime) {
      const baseDate = note.timestamp?.toDate?.() ?? new Date()
      nextTimestamp = timeStringToTimestamp(editTime, baseDate)
    }

    setIsSaving(true)
    setError(null)
    try {
      await onUpdate(note.id, next, nextTimestamp)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update note:', err)
      setError('Unable to save note')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this note?')) return
    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(note.id)
    } catch (err) {
      console.error('Failed to delete note:', err)
      setError('Unable to delete note')
      setIsDeleting(false)
    }
  }

  async function handlePhotoUpload(file) {
    const url = await uploadFieldNotePhoto({
      file,
      jobId: note.jobId,
      dailyEntryId: note.dailyEntryId,
      fieldNoteId: note.id,
    })
    onPhotosChanged(note.id, (current) => [...current, url])
  }

  async function handlePhotoDelete(url) {
    await deleteFieldNotePhoto({ url, fieldNoteId: note.id })
    onPhotosChanged(note.id, (current) => current.filter((u) => u !== url))
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <li className="field-note">

      {/* Time in left gutter */}
      <span
        className="field-note__time"
        aria-label={formatTimestamp(note.timestamp)}
      >
        {shortTime(note.timestamp)}
      </span>

      {/* Spine dot */}
      <span className="field-note__dot" aria-hidden="true" />

      {/* Main body */}
      <div className="field-note__body">

        {/* Note text or edit textarea */}
        {!isEditing ? (
          <div className="field-note__text">{note.text}</div>
        ) : (
          <textarea
            className="input textarea"
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            disabled={isSaving}
            aria-label="Edit note"
          />
        )}

        {/* Time input — edit mode only */}
        {isEditing && (
          <div className="field-note__edit-time">
            <span className="field-note-form__time-label">Time</span>
            <input
              type="time"
              className="input field-note-form__time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              disabled={isSaving}
              aria-label="Note time"
            />
          </div>
        )}

        {error && <p className="form__error">{error}</p>}

        {/* Meta row: author + action buttons */}
        <div className="field-note__meta">
          {note.createdByName && (
            <span className="field-note__author">{note.createdByName}</span>
          )}

          <div className="field-note__actions">
            {!isEditing ? (
              <button
                type="button"
                className="btn btn--secondary field-note__btn"
                onClick={startEdit}
                disabled={isDeleting}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn field-note__btn"
                  onClick={saveEdit}
                  disabled={isSaving || !editText.trim()}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary field-note__btn"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger field-note__btn"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Photos — collapsed by default */}
        <div className="photos-section">
          <button
            type="button"
            className="photos-section__toggle"
            onClick={() => setIsPhotosOpen((v) => !v)}
            aria-expanded={isPhotosOpen}
          >
            <span className="photos-section__label">Photos</span>
            {photoCount > 0 && (
              <span className="photos-section__count">{photoCount}</span>
            )}
            <span
              className={`photos-section__chevron${isPhotosOpen ? ' photos-section__chevron--open' : ''}`}
              aria-hidden="true"
            >
              ›
            </span>
          </button>

          {isPhotosOpen && (
            <div className="photos-section__body">
              <PhotoUploader
                disabled={isDeleting}
                onUpload={handlePhotoUpload}
              />
              <PhotoGallery
                urls={note.photoUrls}
                onDelete={handlePhotoDelete}
                disabled={isDeleting}
              />
            </div>
          )}
        </div>

      </div>
    </li>
  )
}
