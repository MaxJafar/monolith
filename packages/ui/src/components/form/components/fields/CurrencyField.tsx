// SPDX-License-Identifier: 0BSD
import { CurrencyInput, type CurrencyInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const CurrencyField = bindField<number, CurrencyInputProps>(
  CurrencyInput,
  value => value ?? 0
)
