import { WORKER_TYPES, WORKER_TYPE_LABELS } from '../firebase/dailyEntries.js'

export default function WorkerRows({ workers, onChange, disabled }) {
  function updateRow(index, patch) {
    const next = workers.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function removeRow(index) {
    onChange(workers.filter((_, i) => i !== index))
  }

  function addRow() {
    onChange([...workers, { type: 'labourer', count: 1 }])
  }

  return (
    <div className="repeater">
      {workers.length === 0 && (
        <p className="repeater__empty text-muted">No workers added.</p>
      )}

      {workers.map((row, index) => {
        const showLegacyOption =
          row.type && !WORKER_TYPES.includes(row.type)
        return (
          <div key={index} className="repeater__row">
            <select
              className="input repeater__select"
              value={row.type}
              onChange={(e) => updateRow(index, { type: e.target.value })}
              disabled={disabled}
              aria-label="Worker type"
            >
              {showLegacyOption && (
                <option value={row.type}>{row.type} (legacy)</option>
              )}
              {WORKER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORKER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className="input repeater__count"
              value={row.count}
              onChange={(e) => updateRow(index, { count: e.target.value })}
              disabled={disabled}
              aria-label="Worker count"
            />
            <button
              type="button"
              className="btn btn--secondary repeater__remove"
              onClick={() => removeRow(index)}
              disabled={disabled}
              aria-label="Remove worker row"
            >
              Remove
            </button>
          </div>
        )
      })}

      <button
        type="button"
        className="btn btn--secondary"
        onClick={addRow}
        disabled={disabled}
      >
        Add worker type
      </button>
    </div>
  )
}
