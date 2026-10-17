import { ListboxInput, ListboxOption, Text } from '@monolith/ui'

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  let emptyValue = '__tech_lab_empty__'
  while (options.some(option => option.value === emptyValue)) emptyValue += '_'

  const encode = (value: string) => (value === '' ? emptyValue : value)

  return (
    <ListboxInput<string>
      disabled={disabled}
      icon="tabler:list"
      label={label}
      renderContent={selected => (
        <Text>
          {options.find(option => encode(option.value) === selected)?.label ??
            ''}
        </Text>
      )}
      value={encode(value)}
      onChange={selected => {
        const option = options.find(option => encode(option.value) === selected)

        if (option) onChange(option.value)
      }}
    >
      {options.map(option => (
        <ListboxOption
          key={option.value}
          label={option.label}
          value={encode(option.value)}
        />
      ))}
    </ListboxInput>
  )
}
