// SPDX-License-Identifier: 0BSD
import { ColorInput, type ColorInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const ColorField = bindField<string, ColorInputProps>(
  ColorInput,
  value => value ?? ''
)
