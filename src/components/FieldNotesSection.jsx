import { useEffect, useState } from 'react'
import { useAuth } from '../utils/AuthContext.jsx'
import {
  listFieldNotes,
  createFieldNote,
  updateFieldNote,
  deleteFieldNote,
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

  // ── Mutations (unchanged) ─────────────────────────────────────

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

      {/* Section heading */}
      <div className="section-header">
        <h2>Field notes</h2>
      </div>

      {/* ── Quick-add form — TOP of section ─────────────────────
          Form sits above the note list so adding a note never
          requires scrolling past existing entries.              */}
      <form className="field-note-form" onSubmit={handleAdd}>
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

      {/* ── Loading / error states ── */}
      {isLoading && <p className="text-muted">Loading notes…</p>}

      {loadError && !isLoading && (
        <div className="card error-card">
          <p>{loadError}</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !loadError && notes.length === 0 && (
        <p className="text-muted">
          No field notes yet — add the first one above.
        </p>
      )}

      {/* ── Timeline list ── */}
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

    </section>
  )
}
