import { Flex, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { computedKinds } from '../../../computed'
import { type CellValue, type Field, isISODate } from '../../../shared'
import { FieldValue } from './FieldValue'
import { FilesProperty } from './FilesProperty'
import { SelectInput } from './SelectInput'

export function PropertyEditor({
  field,
  value,
  disabled = false,
  onChange
}: {
  field: Field
  value: CellValue | undefined
  disabled?: boolean
  onChange: (value: CellValue) => void
}) {
  const { people } = useDatabases()
  if (computedKinds.has(field.kind))
    return (
      <Flex align="center" gap="sm" minHeight="32px">
        <Text color="muted" size="sm">
          {field.name}
        </Text>
        <FieldValue field={field} value={value} />
      </Flex>
    )
  if (field.kind === 'files')
    return (
      <FilesProperty
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    )
  if (['person', 'select', 'status'].includes(field.kind))
    return (
      <SelectInput
        inline
        disabled={disabled}
        label={field.name}
        options={[
          { value: '', label: '—' },
          ...(field.kind === 'person'
            ? people.map(person => ({ value: person.id, label: person.label }))
            : field.config.options.map(option => ({
                value: option,
                label: option
              })))
        ]}
        value={typeof value === 'string' ? value : ''}
        onChange={value => onChange(value || null)}
      />
    )
  if (field.kind === 'checkbox')
    return (
      <label className="database-checkbox-option">
        <span>{field.name}</span>
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
        />
      </label>
    )
  if (field.kind === 'multi-select') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className="database-compact-multiselect" disabled={disabled}>
        <legend>{field.name}</legend>
        <div className="database-checkbox-list">
          {field.config.options.map(option => (
            <label className="database-checkbox-option" key={option}>
              <span>{option}</span>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={e =>
                  onChange(
                    e.target.checked
                      ? [...selected, option]
                      : selected.filter(item => item !== option)
                  )
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
    )
  }
  return (
    <label className="database-compact-input-stack">
      <span>{field.name}</span>
      <input
        className="database-value-input"
        disabled={disabled}
        type={
          field.kind === 'number'
            ? 'number'
            : field.kind === 'date'
              ? 'date'
              : field.kind === 'email'
                ? 'email'
                : field.kind === 'url'
                  ? 'url'
                  : field.kind === 'phone'
                    ? 'tel'
                    : 'text'
        }
        step={field.kind === 'number' ? 'any' : undefined}
        value={
          typeof value === 'number' || typeof value === 'string' ? value : ''
        }
        onChange={e => {
          const next = e.target.value
          if (!next) onChange(null)
          else if (field.kind === 'number') {
            if (Number.isFinite(Number(next))) onChange(Number(next))
          } else if (field.kind !== 'date' || isISODate(next)) onChange(next)
        }}
      />
    </label>
  )
}
