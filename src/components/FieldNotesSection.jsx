import { useEffect, useState } from 'react'
import { useAuth } from '../utils/AuthContext.jsx'
import {
  listFieldNotes,
  createFieldNote,
  updateFieldNote,
  deleteFieldNote,
} from '../firebase/fieldNotes.js'
import FieldNoteItem from './FieldNoteItem.jsx'

function currentTimeString() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function sortByTimestamp(notes) {
  return [...notes].sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0
    const tb = b.timestamp?.toMillis?.() ?? 0
    return ta - tb
  })
}

export default function FieldNotesSection({ jobId, dailyEntryId }) {
  const { user } = useAuth()

  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [newText, setNewText] = useState('')
  const [newTime, setNewTime] = useState(currentTimeString)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // ── Load ─────────────────────────────────────────────────────

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
    return () => { cancelled = true }
  }, [dailyEntryId])

  // ── Mutations ─────────────────────────────────────────────────

  async function handleAdd(event) {
    event.preventDefault()
    const text = newText.trim()
    if (!text) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const created = await createFieldNote(jobId, dailyEntryId, text, user, newTime || null)
      setNotes((prev) => sortByTimestamp([...prev, created]))
      setNewText('')
      setNewTime(currentTimeString())
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveError('Unable to save note')
    } finally {
      setIsSaving(false)
    }
  }

  // nextTimestamp: optional Firestore Timestamp built by FieldNoteItem
  // when the user changes the note time during editing.
  async function handleUpdate(noteId, nextText, nextTimestamp) {
    await updateFieldNote(noteId, nextText, nextTimestamp)
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === noteId
          ? { ...n, text: nextText, ...(nextTimestamp ? { timestamp: nextTimestamp } : {}) }
          : n
      )
      return nextTimestamp ? sortByTimestamp(updated) : updated
    })
  }

  async function handleDelete(noteId) {
    await deleteFieldNote(noteId)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  function handlePhotosChanged(noteId, nextOrUpdater) {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n
        const next =
          typeof nextOrUpdater === 'function'
            ? nextOrUpdater(n.photoUrls || [])
            : nextOrUpdater
        return { ...n, photoUrls: next }
      })
    )
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <section className="stack">

      {/* Loading / error states */}
      {isLoading && <p className="text-muted">Loading notes…</p>}

      {loadError && !isLoading && (
        <div className="card error-card">
          <p>{loadError}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && notes.length === 0 && (
        <p className="text-muted">No field notes yet — add the first one below.</p>
      )}

      {/* Timeline list */}
      {!isLoading && !loadError && notes.length > 0 && (
        <div className="card" style={{ padding: '8px 14px' }}>
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
        </div>
      )}

      {/* Quick-add form — bottom of section */}
      <form className="field-note-form" onSubmit={handleAdd}>
        {/* Time selector row */}
        <div className="field-note-form__time-row">
          <label className="field-note-form__time-label" htmlFor="new-note-time">
            Time
          </label>
          <input
            id="new-note-time"
            type="time"
            className="input field-note-form__time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* Text + submit row */}
        <div className="field-note-form__row">
          <textarea
            className="input textarea field-note-form__textarea"
            rows={2}
            placeholder="Note at this moment…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={isSaving}
            aria-label="New field note"
          />
          <button
            type="submit"
            className="btn field-note-form__submit"
            disabled={isSaving || !newText.trim()}
            aria-label="Add note"
          >
            {isSaving ? '…' : 'Add'}
          </button>
        </div>

        {saveError && <p className="form__error">{saveError}</p>}
      </form>

    </section>
  )
}
