import { style } from '@vanilla-extract/css'

import { COLORS } from '@lifeforge/ui'

export const svg = style({
  position: 'relative',
  width: '24rem',
  height: '24rem',
  transform: 'rotate(-90deg)'
})

export const backgroundCircle = style({
  color: COLORS['bg-200'],
  selectors: {
    '.dark &': {
      color: COLORS['bg-800']
    }
  }
})

export const progressCircle = style({
  transition: 'all 300ms'
})
