// SPDX-License-Identifier: 0BSD
import { NumberInput, type NumberInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const NumberField = bindField<number, NumberInputProps>(
  NumberInput,
  value => value ?? 0
)
