import { useState, useRef } from 'react'
import { saveSewer } from '../firebase/jobDetails.js'

// ── Default option lists (sewer cards) ────────────────────────
// Callers can override any of these via props.

const DEFAULT_PIPE_SIZE_OPTIONS = [
  '200mm', '250mm', '300mm', '375mm', '450mm', '525mm', '600mm', '675mm',
  '750mm', '825mm', '900mm', '975mm', '1050mm', '1200mm', '1350mm', '1500mm',
  '1650mm', '1800mm', '1950mm', '2100mm', '2250mm', '2400mm', '3000mm', 'Custom',
]

const DEFAULT_MATERIAL_OPTIONS = ['PVC', 'Concrete']

const DEFAULT_BEDDING_OPTIONS = [
  "Granular 'A'", "Granular 'B'", "Granular 'C'", '3/4" Stone', 'Custom',
]

const DEFAULT_COVER_OPTIONS = [
  "Granular 'A'", "Granular 'B'", "Granular 'C'", '3/4" Stone', 'Native Fill', 'Custom',
]

// ── Helpers ────────────────────────────────────────────────────

function hasSewerData(sewer) {
  return (
    sewer.pipeEntries.length > 0 ||
    (sewer.bedding || '').trim() !== '' ||
    (sewer.cover || '').trim() !== ''
  )
}

function cloneSewer(s) {
  return { ...s, pipeEntries: s.pipeEntries.map((e) => ({ ...e })) }
}

function pipeEntryLabel(entry) {
  if (!entry.size) return null
  if (entry.size === 'Custom') return entry.customMaterial || 'Custom'
  return entry.material ? `${entry.size} ${entry.material}` : entry.size
}

function displayValue(main, custom) {
  if (!main) return '—'
  return main === 'Custom' ? (custom || '—') : main
}

// ── SewerCard ─────────────────────────────────────────────────
// Generic pipe-section card. sectionKey maps to the Firestore
// field name (e.g. 'sanitarySewers', 'watermain').
// Pass coverOptions={null} to hide the Cover section entirely.

export default function SewerCard({
  jobId,
  user,
  sectionKey,
  title,
  initialData,
  pipeSizeOptions = DEFAULT_PIPE_SIZE_OPTIONS,
  materialOptions = DEFAULT_MATERIAL_OPTIONS,
  beddingOptions = DEFAULT_BEDDING_OPTIONS,
  coverOptions = DEFAULT_COVER_OPTIONS,
}) {
  const [sewer, setSewer] = useState(initialData)
  const [isEditing, setIsEditing] = useState(!hasSewerData(initialData))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const savedSnapshotRef = useRef(initialData)

  // ── Entry list handlers ──────────────────────────────────────

  function updateEntry(index, patch) {
    setSewer((prev) => {
      const entries = prev.pipeEntries.slice()
      entries[index] = { ...entries[index], ...patch }
      return { ...prev, pipeEntries: entries }
    })
  }

  function removeEntry(index) {
    setSewer((prev) => ({
      ...prev,
      pipeEntries: prev.pipeEntries.filter((_, i) => i !== index),
    }))
  }

  function addEntry() {
    setSewer((prev) => ({
      ...prev,
      pipeEntries: [...prev.pipeEntries, { size: '', material: '', customMaterial: '' }],
    }))
  }

  function handleChange(field, value) {
    setSewer((prev) => ({ ...prev, [field]: value }))
  }

  // ── Edit / cancel / save ─────────────────────────────────────

  function handleStartEdit() {
    savedSnapshotRef.current = cloneSewer(sewer)
    setSaveError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setSewer(savedSnapshotRef.current)
    setSaveError(null)
    setIsEditing(false)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const trimmed = {
        pipeEntries: sewer.pipeEntries.map((e) => ({
          size: (e.size || '').trim(),
          material: (e.material || '').trim(),
          customMaterial: (e.customMaterial || '').trim(),
        })),
        bedding: (sewer.bedding || '').trim(),
        beddingCustom: (sewer.beddingCustom || '').trim(),
        cover: (sewer.cover || '').trim(),
        coverCustom: (sewer.coverCustom || '').trim(),
      }
      await saveSewer(jobId, sectionKey, trimmed, user)
      savedSnapshotRef.current = cloneSewer(trimmed)
      setSewer(trimmed)
      setIsEditing(false)
    } catch (err) {
      console.error(`Failed to save ${sectionKey}:`, err)
      setSaveError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      <div className="section-header">
        <h2>{title}</h2>
        {!isEditing && (
          <button type="button" className="btn btn--secondary" onClick={handleStartEdit}>
            Edit
          </button>
        )}
      </div>

      {isEditing ? (

        /* ── EDIT STATE ─────────────────────────────────────── */
        <>
          <div className="card stack">

            {/* Pipe Sizes */}
            <div className="rd-layer">
              <div className="rd-layer__name">Pipe Sizes</div>

              {sewer.pipeEntries.length > 0 && (
                <div className="sewer-entries">
                  {sewer.pipeEntries.map((entry, i) => (
                    <div key={i} className="sewer-entry">

                      <div className="field">
                        <label className="field__label">Pipe Size</label>
                        <select
                          className="input"
                          value={entry.size}
                          onChange={(e) =>
                            updateEntry(i, {
                              size: e.target.value,
                              material: '',
                              customMaterial: '',
                            })
                          }
                          disabled={isSaving}
                        >
                          <option value="">Select size…</option>
                          {pipeSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {entry.size && entry.size !== 'Custom' && (
                        <div className="field">
                          <label className="field__label">Material</label>
                          <select
                            className="input"
                            value={entry.material}
                            onChange={(e) => updateEntry(i, { material: e.target.value })}
                            disabled={isSaving}
                          >
                            <option value="">Select material…</option>
                            {materialOptions.map((mat) => (
                              <option key={mat} value={mat}>{mat}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {entry.size === 'Custom' && (
                        <div className="field">
                          <label className="field__label">Custom Pipe</label>
                          <input
                            className="input"
                            type="text"
                            value={entry.customMaterial}
                            onChange={(e) =>
                              updateEntry(i, { customMaterial: e.target.value })
                            }
                            placeholder="e.g. 275mm HDPE"
                            disabled={isSaving}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn--secondary sewer-entry__remove"
                        onClick={() => removeEntry(i)}
                        disabled={isSaving}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn btn--secondary sewer-add-entry"
                onClick={addEntry}
                disabled={isSaving}
              >
                + Add Pipe Entry
              </button>
            </div>

            {/* Bedding */}
            <div className="rd-layer">
              <div className="rd-layer__name">Bedding</div>
              <div className="field">
                <label className="field__label">Material</label>
                <select
                  className="input"
                  value={sewer.bedding}
                  onChange={(e) => handleChange('bedding', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select…</option>
                  {beddingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {sewer.bedding === 'Custom' && (
                <div className="field">
                  <label className="field__label">Custom Bedding</label>
                  <input
                    className="input"
                    type="text"
                    value={sewer.beddingCustom}
                    onChange={(e) => handleChange('beddingCustom', e.target.value)}
                    placeholder="Describe bedding material"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>

            {/* Cover — omitted when coverOptions is null */}
            {coverOptions && (
              <div className="rd-layer">
                <div className="rd-layer__name">Cover</div>
                <div className="field">
                  <label className="field__label">Material</label>
                  <select
                    className="input"
                    value={sewer.cover}
                    onChange={(e) => handleChange('cover', e.target.value)}
                    disabled={isSaving}
                  >
                    <option value="">Select…</option>
                    {coverOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {sewer.cover === 'Custom' && (
                  <div className="field">
                    <label className="field__label">Custom Cover</label>
                    <input
                      className="input"
                      type="text"
                      value={sewer.coverCustom}
                      onChange={(e) => handleChange('coverCustom', e.target.value)}
                      placeholder="Describe cover material"
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="rd-actions">
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            {hasSewerData(savedSnapshotRef.current) && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
            )}
            {saveError && <p className="form__error rd-actions__error">{saveError}</p>}
          </div>
        </>

      ) : (

        /* ── VIEW STATE ─────────────────────────────────────── */
        <div className="card stack">
          <div className="detail-row">
            <div className="detail-row__label">Pipe Sizes</div>
            <div className="detail-row__value">
              {sewer.pipeEntries.filter((e) => e.size).length === 0 ? (
                '—'
              ) : (
                <ul className="sewer-pipe-list">
                  {sewer.pipeEntries
                    .filter((e) => e.size)
                    .map((entry, i) => (
                      <li key={i}>{pipeEntryLabel(entry)}</li>
                    ))}
                </ul>
              )}
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row__label">Bedding</div>
            <div className="detail-row__value">
              {displayValue(sewer.bedding, sewer.beddingCustom)}
            </div>
          </div>
          {coverOptions && (
            <div className="detail-row">
              <div className="detail-row__label">Cover</div>
              <div className="detail-row__value">
                {displayValue(sewer.cover, sewer.coverCustom)}
              </div>
            </div>
          )}
        </div>

      )}
    </>
  )
}
