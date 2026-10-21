// SPDX-License-Identifier: 0BSD
import { ListboxOption as Option } from '@headlessui/react'
import type { ReactElement, ReactNode } from 'react'

import {
  ChoiceContent,
  type ChoiceDecoration
} from '../../shared/components/ChoiceContent'
import { option } from '../../shared/components/choice.css'
import { useListboxMultiple } from '../contexts/ListboxMultipleContext'

export function ListboxOption({
  value,
  label,
  icon,
  color,
  iconAtEnd,
  className,
  selected,
  disabled = false,
  onClick,
  renderColorAndIcon
}: {
  value: unknown
  label: string | ReactElement
  icon?: string | ReactElement
  color?: string
  iconAtEnd?: boolean
  className?: string
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  renderColorAndIcon?: (decoration: ChoiceDecoration) => ReactNode
}) {
  const multiple = useListboxMultiple()
  return (
    <Option
      value={value}
      disabled={disabled}
      className={[option, className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {state => (
        <ChoiceContent
          label={label}
          icon={icon}
          color={color}
          iconAtEnd={iconAtEnd}
          selected={selected ?? state.selected}
          multiple={multiple}
          renderColorAndIcon={renderColorAndIcon}
        />
      )}
    </Option>
  )
}
