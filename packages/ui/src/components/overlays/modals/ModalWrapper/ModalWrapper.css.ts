// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'

const base = style({ overscrollBehavior: 'contain' })
const dimmed = style({
  backgroundColor: 'rgb(0 0 0 / .1)',
  backdropFilter: 'blur(2px)',
  selectors: {
    '.dark &': {
      backgroundColor:
        'color-mix(in srgb, var(--color-bg-950) 40%, transparent)'
    }
  }
})
const invisible = style({ opacity: 0 })
const visible = style({ opacity: 1 })

export const overlay = recipe({
  base,
  variants: {
    topmost: { true: dimmed, false: { backgroundColor: 'transparent' } },
    open: { true: visible, false: invisible }
  }
})
