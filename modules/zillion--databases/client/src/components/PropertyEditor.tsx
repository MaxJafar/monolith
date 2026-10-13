import dayjs from 'dayjs'

import {
  Checkbox,
  DateInput,
  Flex,
  ListboxInput,
  ListboxOption,
  NumberInput,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import type { CellValue, Field } from '../../../shared'
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

  if (field.kind === 'person')
    return (
      <SelectInput
        disabled={disabled}
        label={field.name}
        options={[
          { value: '', label: '—' },
          ...people.map(person => ({ value: person.id, label: person.label }))
        ]}
        value={typeof value === 'string' ? value : ''}
        onChange={value => onChange(value || null)}
      />
    )
  if (field.kind === 'checkbox')
    return (
      <Flex align="center" minHeight="44px">
        <Checkbox
          checked={value === true}
          disabled={disabled}
          label={field.name}
          onCheckedChange={onChange}
        />
      </Flex>
    )
  if (field.kind === 'number')
    return (
      <NumberInput
        disabled={disabled}
        icon="tabler:number"
        label={field.name}
        namespace={false}
        value={typeof value === 'number' ? value : 0}
        onChange={onChange}
      />
    )
  if (field.kind === 'date')
    return (
      <DateInput
        disabled={disabled}
        icon="tabler:calendar"
        label={field.name}
        namespace={false}
        value={
          typeof value === 'string' && value ? dayjs(value).toDate() : null
        }
        onChange={date =>
          onChange(date ? dayjs(date).format('YYYY-MM-DD') : null)
        }
      />
    )
  if (field.kind === 'select')
    return (
      <SelectInput
        disabled={disabled}
        label={field.name}
        options={[
          { value: '', label: '—' },
          ...field.config.options.map(option => ({
            value: option,
            label: option
          }))
        ]}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
      />
    )

  if (field.kind === 'multi-select') {
    const selected = Array.isArray(value) ? value : []

    return (
      <ListboxInput
        multiple
        disabled={disabled}
        icon="tabler:tags"
        label={field.name}
        namespace={false}
        renderContent={() => <Text>{selected.join(', ') || '—'}</Text>}
        value={selected}
        onChange={onChange}
      >
        {field.config.options.map(option => (
          <ListboxOption key={option} label={option} value={option} />
        ))}
      </ListboxInput>
    )
  }

  return (
    <TextInput
      disabled={disabled}
      icon="tabler:text-size"
      label={field.name}
      namespace={false}
      placeholder=""
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
    />
  )
}
