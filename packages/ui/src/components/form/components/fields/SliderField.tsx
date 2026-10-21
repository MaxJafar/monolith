// SPDX-License-Identifier: 0BSD
import { SliderInput, type SliderInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const SliderField = bindField<number, SliderInputProps>(
  SliderInput,
  value => value ?? 0
)
