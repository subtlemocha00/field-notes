import { useEffect, useState } from 'react'
import { useAuth } from '../utils/AuthContext.jsx'
import {
  listFieldNotes,
  createFieldNote,
  updateFieldNote,
  deleteFieldNote
} from '../firebase/fieldNotes.js'
import FieldNoteItem from './FieldNoteItem.jsx'

export default function FieldNotesSection({ jobId, dailyEntryId }) {
  const { user } = useAuth()

  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [newText, setNewText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const result = await listFieldNotes(dailyEntryId)
        if (!cancelled) setNotes(result)
      } catch (err) {
        console.error('Failed to load field notes:', err)
        if (!cancelled) setLoadError('Failed to load notes')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dailyEntryId])

  async function handleAdd(event) {
    event.preventDefault()
    const text = newText.trim()
    if (!text) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const created = await createFieldNote(jobId, dailyEntryId, text, user)
      setNotes((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveError('Unable to save note')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(noteId, nextText) {
    await updateFieldNote(noteId, nextText)
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, text: nextText } : n))
    )
  }

  async function handleDelete(noteId) {
    await deleteFieldNote(noteId)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  function handlePhotosChanged(noteId, photoUrls) {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, photoUrls } : n))
    )
  }

  return (
    <section className="stack">
      <div className="section-header">
        <h2>Field notes</h2>
      </div>

      {isLoading && <p className="text-muted">Loading notes…</p>}

      {loadError && !isLoading && (
        <div className="card error-card">
          <p>{loadError}</p>
        </div>
      )}

      {!isLoading && !loadError && notes.length === 0 && (
        <p className="text-muted">No field notes yet — add the first one below.</p>
      )}

      {!isLoading && !loadError && notes.length > 0 && (
        <ul className="field-note-list">
          {notes.map((note) => (
            <FieldNoteItem
              key={note.id}
              note={note}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onPhotosChanged={handlePhotosChanged}
            />
          ))}
        </ul>
      )}

      <form className="card field-note-form" onSubmit={handleAdd}>
        <label className="field">
          <span className="field__label">New note</span>
          <textarea
            className="input textarea"
            rows={3}
            placeholder="Quick observation…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={isSaving}
          />
        </label>
        {saveError && <p className="form__error">{saveError}</p>}
        <button
          type="submit"
          className="btn btn--block"
          disabled={isSaving || !newText.trim()}
        >
          {isSaving ? 'Saving…' : 'Add note'}
        </button>
      </form>
    </section>
  )
}
