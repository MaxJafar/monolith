// SPDX-License-Identifier: 0BSD
import type { HTMLAttributes, Ref } from 'react'

import {
  type ColorValue,
  type ThemeConditionProp,
  colorWithOpacity,
  mergeStyle,
  resolveColorProp
} from '@/system'

import { Slot } from '../Slot'
import './divide.css'

export type WithDivideProps = Omit<HTMLAttributes<HTMLElement>, 'color'> & {
  ref?: Ref<HTMLElement>
  axis?: 'x' | 'y'
  color?: ThemeConditionProp<ColorValue>
}
export function WithDivide({
  axis = 'y',
  color = { base: 'bg-200', dark: colorWithOpacity('bg-700', '50%') },
  style,
  className,
  children,
  ...content
}: WithDivideProps) {
  const visuals = mergeStyle(resolveColorProp('divideColor', color), {
    className: ['monolith-divider', className].filter(Boolean).join(' '),
    style: style ?? {}
  })
  return (
    <Slot {...content} {...visuals} data-divide-axis={axis}>
      {children}
    </Slot>
  )
}
