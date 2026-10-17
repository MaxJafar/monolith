import type { HTMLAttributes, Ref } from 'react'

import {
  type ColorValue,
  type ThemeConditionProp,
  colorWithOpacity,
  mergeStyle,
  resolveColorProp
} from '@/system'

import { Slot } from '../Slot'
import { type DivideAxis, divideVariants } from './WithDivide.css'

interface WithDivideProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  ref?: Ref<HTMLElement>
  axis?: DivideAxis
  color?: ThemeConditionProp<ColorValue>
}

export function WithDivide({
  axis = 'y',
  color = { base: 'bg-200', dark: colorWithOpacity('bg-700', '50%') },
  className,
  style,
  children,
  ...element
}: WithDivideProps) {
  const decoration = mergeStyle(resolveColorProp('divideColor', color), {
    className: [divideVariants[axis], className].filter(Boolean).join(' '),
    style: style ?? {}
  })
  return (
    <Slot {...element} {...decoration}>
      {children}
    </Slot>
  )
}
