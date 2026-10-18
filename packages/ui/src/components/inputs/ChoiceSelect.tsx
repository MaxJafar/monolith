import { Icon } from '@/components/primitives'

import { Listbox } from './Listbox'
import { ListboxOption } from './ListboxInput/components/ListboxOption'
import './choiceSelect.css'

/** Compact, keyboard-accessible selection shared by workspace overlays. */
export function ChoiceSelect({
  label,
  value,
  options,
  disabled,
  onChange
}: {
  label: string
  value: string
  options: readonly { value: string; label: string; icon?: string }[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const selected = options.find(option => option.value === value)

  return (
    <Listbox
      compact
      aria-label={label}
      className="monolith-choice-select"
      disabled={disabled}
      gap="sm"
      p="sm"
      r="sm"
      renderContent={() => (
        <span className="monolith-choice-label">
          {selected?.icon && <Icon icon={selected.icon} size="15px" />}
          <span>{selected?.label ?? label}</span>
        </span>
      )}
      value={value}
      onChange={onChange}
    >
      {options.map(option => (
        <ListboxOption
          key={option.value}
          className="monolith-choice-option"
          icon={option.icon}
          label={option.label}
          value={option.value}
        />
      ))}
    </Listbox>
  )
}
