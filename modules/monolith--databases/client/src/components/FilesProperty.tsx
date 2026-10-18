import { useEffect, useRef, useState } from 'react'

import type { CellValue, Field } from '../../../shared'

export function FilesProperty({
  field,
  value,
  disabled,
  onChange
}: {
  field: Field
  value: CellValue | undefined
  disabled: boolean
  onChange: (value: CellValue) => void
}) {
  const serialized = Array.isArray(value) ? value.join('\n') : ''
  const [draft, setDraft] = useState(serialized)
  const lastValue = useRef(serialized)
  useEffect(() => {
    if (serialized !== lastValue.current) setDraft(serialized)
    lastValue.current = serialized
  }, [serialized])
  return (
    <label className="database-compact-input-stack">
      <span>{field.name}</span>
      <textarea
        className="database-value-input"
        rows={3}
        disabled={disabled}
        placeholder="https://"
        value={draft}
        onChange={event => {
          const text = event.target.value
          setDraft(text)
          const links = text
            .split('\n')
            .map(link => link.trim())
            .filter(Boolean)
          lastValue.current = links.join('\n')
          onChange(links)
        }}
      />
    </label>
  )
}
