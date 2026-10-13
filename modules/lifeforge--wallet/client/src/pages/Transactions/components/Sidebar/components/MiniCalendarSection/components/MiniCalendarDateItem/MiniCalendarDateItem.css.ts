import { style } from '@vanilla-extract/css'

import { COLORS, colorWithOpacity, vars } from '@lifeforge/ui'

export const selectedBorderAfter = style({
  '::after': {
    content: '',
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: -1,
    height: '120%',
    width: '100%',
    transform: 'translate(-50%, -50%)',
    borderColor: COLORS['custom-500']
  }
})

export const selectedBorderAfterStart = style({
  '::after': {
    borderTop: '1px solid',
    borderBottom: '1px solid',
    borderLeft: '1px solid',
    borderColor: COLORS['custom-500'],
    borderRadius: '0.25rem 0 0 0.25rem'
  }
})

export const selectedBorderAfterEnd = style({
  '::after': {
    borderTop: '1px solid',
    borderBottom: '1px solid',
    borderRight: '1px solid',
    borderColor: COLORS['custom-500'],
    borderRadius: '0 0.25rem 0.25rem 0'
  }
})

export const selectedBorderAfterSingle = style({
  '::after': {
    border: '1px solid',
    borderColor: COLORS['custom-500'],
    borderRadius: '0.25rem'
  }
})

export const betweenBorderAfter = style({
  '::after': {
    content: '',
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: -2,
    height: '120%',
    width: '100%',
    transform: 'translate(-50%, -50%)',
    borderTop: '1px solid',
    borderBottom: '1px solid',
    borderColor: COLORS['custom-500']
  }
})

export const transactionBarTrack = style({
  position: 'absolute',
  bottom: '0.2rem',
  left: '50%',
  zIndex: -2,
  width: '80%',
  aspectRatio: '1 / 1',
  backgroundColor: colorWithOpacity('bg-500', '10%').toString(),
  borderRadius: vars.radii.sm,
  overflow: 'hidden',
  transform: 'translateX(-50%)'
})

export const transactionBar = style({
  position: 'absolute',
  bottom: '0.2rem',
  left: '50%',
  zIndex: -1,
  display: 'flex',
  width: '80%',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: vars.radii.sm,
  transform: 'translateX(-50%)'
})
