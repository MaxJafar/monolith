// SPDX-License-Identifier: 0BSD
import { ComboboxOption as Option } from '@headlessui/react'
import type { ReactElement } from 'react'

import { ChoiceContent } from '../../shared/components/ChoiceContent'
import { option } from '../../shared/components/choice.css'

export function ComboboxOption({
  value,
  ...decoration
}: {
  value: unknown
  label: string | ReactElement
  icon?: string | ReactElement
  iconAtEnd?: boolean
  color?: string
}) {
  return (
    <Option value={value} className={option}>
      {state => <ChoiceContent {...decoration} selected={state.selected} />}
    </Option>
  )
}
