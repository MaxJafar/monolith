// SPDX-License-Identifier: 0BSD
import { TextAreaInput, type TextAreaInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const TextAreaField = bindField<string, TextAreaInputProps>(
  TextAreaInput,
  value => value ?? ''
)
