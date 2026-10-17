import { ListboxInput, ListboxOption, Text } from '@monolith/ui'

export default function Select({
  label,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <ListboxInput
      customActive
      disabled={disabled}
      icon="tabler:selector"
      label={label}
      renderContent={() => (
        <Text>{options.find(o => o.value === value)?.label ?? '—'}</Text>
      )}
      value={value}
      onChange={onChange}
    >
      {options.map(o => (
        <ListboxOption key={o.value} label={o.label} value={o.value} />
      ))}
    </ListboxInput>
  )
}
