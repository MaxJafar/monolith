import { useModuleTranslation } from '@lifeforge/localization'
import {
  Checkbox,
  ListboxInput,
  ListboxOption,
  NumberInput,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import type { Field, FieldValue } from './EntityManager'

export default function FieldControl({
  field,
  value,
  onChange
}: {
  field: Field
  value: FieldValue
  onChange: (value: FieldValue) => void
}) {
  const { t } = useModuleTranslation()

  if (field.kind === 'boolean')
    return (
      <Checkbox
        checked={value === true}
        label={t('inputs.' + field.name)}
        onCheckedChange={onChange}
      />
    )
  if (field.kind === 'number')
    return (
      <NumberInput
        icon="tabler:currency-dollar"
        label={'inputs.' + field.name}
        min={0}
        value={typeof value === 'number' ? value : 0}
        onChange={onChange}
      />
    )

  if (field.kind === 'select' || field.kind === 'multi') {
    const choices = field.options || []
    const display = Array.isArray(value)
      ? value
          .map(id => choices.find(option => option.value === id)?.label || id)
          .join(', ')
      : choices.find(option => option.value === value)?.label

    return (
      <ListboxInput
        icon="tabler:category"
        label={'inputs.' + field.name}
        multiple={field.kind === 'multi'}
        renderContent={() => <Text truncate>{display || t('none')}</Text>}
        required={field.required}
        value={
          field.kind === 'multi'
            ? Array.isArray(value)
              ? value
              : []
            : typeof value === 'string'
              ? value
              : ''
        }
        onChange={(next: string | string[]) => onChange(next || null)}
      >
        {!field.required && field.kind !== 'multi' && (
          <ListboxOption label={t('none')} value="" />
        )}
        {choices.map(option => (
          <ListboxOption
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </ListboxInput>
    )
  }

  const Input = field.kind === 'area' ? TextAreaInput : TextInput

  return (
    <Input
      icon="tabler:text-size"
      label={'inputs.' + field.name}
      placeholder={'inputs.' + field.name}
      required={field.required}
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
    />
  )
}
