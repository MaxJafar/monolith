import { ListboxInput, ListboxOption, Text } from '@lifeforge/ui'

export function SelectInput({
  label,
  value,
  options,
  disabled = false,
  onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <ListboxInput
      customActive
      disabled={disabled}
      icon="tabler:selector"
      label={label}
      namespace={false}
      renderContent={() => (
        <Text>
          {options.find(option => option.value === value)?.label ?? label}
        </Text>
      )}
      value={value}
      onChange={onChange}
    >
      {options.map(option => (
        <ListboxOption
          key={option.value}
          label={option.label}
          value={option.value}
        />
      ))}
    </ListboxInput>
  )
}
