// SPDX-License-Identifier: 0BSD
import type { ComponentProps } from 'react'
import { NumericFormat } from 'react-number-format'

import type { Button } from '../Button'
import type { InputWrapperPassthrough } from '../shared/components/InputWrapper'
import { NumericTextInput } from '../shared/components/NumericTextInput'
import type { InputVariants } from '../shared/types'

export interface NumberInputProps {
  label: string
  icon: string
  value: number
  onChange: (value: number) => void
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  namespace?: string | false
  errorMsg?: string
  min?: number
  max?: number
  placeholder?: string
  actionButtonProps?: ComponentProps<typeof Button>
  onEnter?: () => void
  wrapperProps?: InputWrapperPassthrough
}
export function NumberInput({
  value,
  onChange,
  min,
  max,
  placeholder = '0',
  ...input
}: NumberInputProps & InputVariants<true>) {
  return (
    <NumericFormat
      {...input}
      type="text"
      customInput={NumericTextInput}
      value={Number.isFinite(value) ? value : ''}
      placeholder={placeholder}
      onValueChange={(next, source) => {
        if (source.source === 'event') onChange(next.floatValue ?? 0)
      }}
      onBlur={() => {
        const lower =
          min !== undefined && Number.isFinite(min) ? min : -Infinity
        const upper = max !== undefined && Number.isFinite(max) ? max : Infinity
        const bounded = Math.min(
          upper,
          Math.max(lower, Number.isFinite(value) ? value : 0)
        )
        if (lower <= upper && bounded !== value) onChange(bounded)
      }}
    />
  )
}
