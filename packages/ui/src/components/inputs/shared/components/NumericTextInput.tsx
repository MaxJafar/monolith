// SPDX-License-Identifier: 0BSD
import type { ChangeEventHandler } from 'react'

import { TextInput, type TextInputProps } from '../../TextInput'

export function NumericTextInput({
  value,
  onChange,
  ...input
}: Omit<TextInputProps, 'value' | 'onChange'> & {
  value?: string | number
  onChange?: ChangeEventHandler<HTMLInputElement>
}) {
  return (
    <TextInput
      {...({
        ...input,
        value: String(value ?? ''),
        inputMode: 'decimal',
        onRawChange: onChange,
        onChange: () => {}
      } as TextInputProps)}
    />
  )
}
