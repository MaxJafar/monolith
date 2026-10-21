// SPDX-License-Identifier: 0BSD
import type { ComponentProps } from 'react'

import { RRuleInput } from '@/components/inputs'

import { bindField } from './binding'

export const RRuleField = bindField<string, ComponentProps<typeof RRuleInput>>(
  RRuleInput,
  value => value ?? ''
)
