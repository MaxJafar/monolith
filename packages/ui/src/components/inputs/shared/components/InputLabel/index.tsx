// SPDX-License-Identifier: 0BSD
import type { CSSProperties } from 'react'

import { Text } from '@/components/primitives'

import { useInputFocused } from '../../contexts/InputFocusContext'
import {
  inputLabelActiveStyle,
  inputLabelInactiveStyle
} from './InputLabel.css'

export function InputLabel({
  label,
  active,
  required,
  hasError,
  className,
  style,
  htmlFor
}: {
  label: string
  active: boolean
  required?: boolean
  hasError?: boolean
  className?: string
  style?: CSSProperties
  htmlFor?: string
}) {
  const focused = useInputFocused()
  return (
    <Text
      as="label"
      htmlFor={htmlFor}
      truncate
      color={hasError ? 'dangerous' : focused ? 'primary' : 'muted'}
      weight="medium"
      className={[
        'monolith-input-label',
        active || focused ? inputLabelActiveStyle : inputLabelInactiveStyle,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </Text>
  )
}
