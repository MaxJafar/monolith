import { ChoiceSelect, Stack, Text } from '@monolith/ui'

export function SelectInput({
  label,
  value,
  options,
  disabled = false,
  inline = false,
  onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled?: boolean
  inline?: boolean
  onChange: (value: string) => void
}) {
  if (inline)
    return (
      <div className="database-compact-setting">
        <Text size="sm">{label}</Text>
        <ChoiceSelect
          label={label}
          value={value}
          options={options}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    )
  return (
    <Stack gap="xs" minWidth="0">
      <Text size="xs" color="muted">
        {label}
      </Text>
      <ChoiceSelect
        label={label}
        value={value}
        options={options}
        disabled={disabled}
        onChange={onChange}
      />
    </Stack>
  )
}
