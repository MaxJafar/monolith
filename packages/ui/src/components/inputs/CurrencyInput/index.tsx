// SPDX-License-Identifier: 0BSD
import { NumericFormat } from 'react-number-format'

import type { InputWrapperPassthrough } from '../shared/components/InputWrapper'
import { NumericTextInput } from '../shared/components/NumericTextInput'
import type { InputVariants } from '../shared/types'

export type CurrencyInputProps = InputVariants & {
  value: number
  onChange: (value: number) => void
  prefix?: string
  placeholder?: string
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  namespace?: string | false
  errorMsg?: string
  onEnter?: () => void
  wrapperProps?: InputWrapperPassthrough
}
export function CurrencyInput({
  value,
  onChange,
  prefix,
  placeholder = '0.00',
  ...input
}: CurrencyInputProps) {
  return (
    <NumericFormat
      {...input}
      type="text"
      customInput={NumericTextInput}
      value={Number.isFinite(value) && value !== 0 ? value : ''}
      prefix={prefix}
      placeholder={placeholder}
      decimalScale={2}
      thousandSeparator=","
      onValueChange={(next, source) => {
        if (source.source === 'event') onChange(next.floatValue ?? 0)
      }}
    />
  )
}
