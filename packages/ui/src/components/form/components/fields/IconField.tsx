// SPDX-License-Identifier: 0BSD
import { IconInput, type IconInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const IconField = bindField<string, IconInputProps>(
  IconInput,
  value => value ?? ''
)
