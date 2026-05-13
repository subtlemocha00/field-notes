import { useState } from 'react'
import { getPreviousDailyEntry } from '../firebase/dailyEntries.js'

// Copies workers or equipment from the most recent earlier daily entry
// for the same job. Replaces the current section data.
//
// Props:
//   jobId          — current job id
//   currentDate    — ISO date string `YYYY-MM-DD` of the entry being edited/created
//   field          — 'workers' | 'equipment'
//   hasCurrentData — boolean, true if the current section already has rows (triggers confirm)
//   onCopy         — callback(rowsArray) to replace section state
//   disabled       — disables the button (e.g. while saving)
export default function CopyPreviousButton({
  jobId,
  currentDate,
  field,
  hasCurrentData,
  onCopy,
  disabled
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const label =
    field === 'workers' ? 'Copy Previous Workers' : 'Copy Previous Equipment'
  const confirmText =
    field === 'workers'
      ? 'Replace current workers with workers from previous day?'
      : 'Replace current equipment with equipment from previous day?'

  async function handleClick() {
    setMessage(null)

    if (!currentDate) {
      setMessage('Set the date first.')
      return
    }

    setIsLoading(true)
    try {
      const previous = await getPreviousDailyEntry(jobId, currentDate)
      if (!previous) {
        setMessage('No previous daily entry found.')
        return
      }

      const sourceRows = Array.isArray(previous[field]) ? previous[field] : []

      if (hasCurrentData) {
        if (!window.confirm(confirmText)) return
      }

      // Clone rows so edits don't mutate the fetched object
      const copied = sourceRows.map((row) => ({ ...row }))
      onCopy(copied)
    } catch (err) {
      console.error(`Failed to copy previous ${field}:`, err)
      setMessage('Could not load previous entry. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="copy-prev">
      <button
        type="button"
        className="btn btn--secondary copy-prev__btn"
        onClick={handleClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Loading…' : label}
      </button>
      {message && <p className="copy-prev__msg text-muted">{message}</p>}
    </div>
  )
}
