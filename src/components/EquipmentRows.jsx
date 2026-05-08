import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS
} from '../firebase/dailyEntries.js'

export default function EquipmentRows({ equipment, onChange, disabled }) {
  function updateRow(index, patch) {
    const next = equipment.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function removeRow(index) {
    onChange(equipment.filter((_, i) => i !== index))
  }

  function addRow() {
    onChange([
      ...equipment,
      { type: 'excavator', quantity: 1, details: '' }
    ])
  }

  return (
    <div className="repeater">
      {equipment.length === 0 && (
        <p className="repeater__empty text-muted">No equipment added.</p>
      )}

      {equipment.map((row, index) => {
        const isManual = row.type === 'manual'
        const showLegacyOption =
          row.type && !EQUIPMENT_TYPES.includes(row.type)
        return (
          <div key={index} className="repeater__group">
            <div className="repeater__row">
              <select
                className="input repeater__select"
                value={row.type}
                onChange={(e) => updateRow(index, { type: e.target.value })}
                disabled={disabled}
                aria-label="Equipment type"
              >
                {showLegacyOption && (
                  <option value={row.type}>{row.type} (legacy)</option>
                )}
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EQUIPMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="input repeater__count"
                value={row.quantity}
                onChange={(e) =>
                  updateRow(index, { quantity: e.target.value })
                }
                disabled={disabled}
                aria-label="Equipment quantity"
              />
              <button
                type="button"
                className="btn btn--secondary repeater__remove"
                onClick={() => removeRow(index)}
                disabled={disabled}
                aria-label="Remove equipment row"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              className="input"
              placeholder={
                isManual
                  ? 'Equipment name (and any details)'
                  : 'Details (model, size, notes)'
              }
              value={row.details}
              onChange={(e) => updateRow(index, { details: e.target.value })}
              disabled={disabled}
              aria-label="Equipment details"
            />
          </div>
        )
      })}

      <button
        type="button"
        className="btn btn--secondary"
        onClick={addRow}
        disabled={disabled}
      >
        Add equipment
      </button>
    </div>
  )
}
