// SPDX-License-Identifier: 0BSD
import { DateInput, type DateInputProps } from '@/components/inputs'

import { bindField } from './binding'

export const DateField = bindField<Date | string, DateInputProps>(
  DateInput,
  value => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : date
  }
)
