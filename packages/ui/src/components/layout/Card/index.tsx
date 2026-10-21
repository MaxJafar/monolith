// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import type { FlexProps } from '@/components/primitives'
import { renderSurface } from '@/components/primitives/surface'
import { isColorWithOpacity } from '@/system/colors/color-with-opacity'
import { surface } from '@/system/colors/surfaces'

import './card.css'

export type CardProps<T extends ElementType = 'div'> = FlexProps<T> & {
  isInteractive?: boolean
}

export function Card<T extends ElementType = 'div'>({
  isInteractive = false,
  className,
  bg,
  ...content
}: CardProps<T>) {
  const defaults = isInteractive ? surface.defaultInteractive : surface.default
  const background =
    typeof bg === 'string' || isColorWithOpacity(bg)
      ? bg
      : { ...defaults, ...bg }
  return renderSurface(
    {
      direction: 'column',
      position: 'relative',
      p: 'lg',
      r: 'lg',
      ...content,
      bg: background,
      className: ['monolith-card', className].filter(Boolean).join(' '),
      'data-interactive': isInteractive || undefined
    },
    'flex'
  )
}
