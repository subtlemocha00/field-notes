import { useState } from 'react'
import { formatTimestamp } from '../utils/format.js'
import {
  uploadFieldNotePhoto,
  deleteFieldNotePhoto
} from '../firebase/photos.js'
import PhotoUploader from './PhotoUploader.jsx'
import PhotoGallery from './PhotoGallery.jsx'

export default function FieldNoteItem({
  note,
  onUpdate,
  onDelete,
  onPhotosChanged
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(note.text)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setEditText(note.text)
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
    setIsSaving(true)
    setError(null)
    try {
      await onUpdate(note.id, next)
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
      fieldNoteId: note.id
    })
    onPhotosChanged(note.id, [...note.photoUrls, url])
  }

  async function handlePhotoDelete(url) {
    await deleteFieldNotePhoto({ url, fieldNoteId: note.id })
    onPhotosChanged(
      note.id,
      note.photoUrls.filter((u) => u !== url)
    )
  }

  return (
    <li className="field-note">
      <div className="field-note__meta">
        <span className="field-note__time">
          {formatTimestamp(note.timestamp)}
        </span>
        {note.createdByName && (
          <span className="field-note__author">{note.createdByName}</span>
        )}
      </div>

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

      {error && <p className="form__error">{error}</p>}

      <div className="field-note__actions">
        {!isEditing ? (
          <>
            <button
              type="button"
              className="btn btn--secondary field-note__btn"
              onClick={startEdit}
              disabled={isDeleting}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn--danger field-note__btn"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </>
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
          </>
        )}
      </div>

      <div className="photos-section">
        <span className="photos-section__label">Photos</span>
        <PhotoGallery
          urls={note.photoUrls}
          onDelete={handlePhotoDelete}
          disabled={isDeleting}
        />
        <PhotoUploader
          disabled={isDeleting}
          onUpload={handlePhotoUpload}
        />
      </div>
    </li>
  )
}
