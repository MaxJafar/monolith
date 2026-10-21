// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'

const label = style({
  position: 'absolute',
  left: 0,
  maxWidth: '100%',
  pointerEvents: 'none',
  transition: 'top 100ms ease, font-size 100ms ease',
  transform: 'translateY(-50%)',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } }
})
export const inputLabelActiveStyle = style([
  label,
  { top: 'calc(var(--spacing) * 3)', fontSize: 'var(--text-xs)' }
])
export const inputLabelInactiveStyle = style([
  label,
  { top: '50%', fontSize: 'var(--text-base)' }
])
