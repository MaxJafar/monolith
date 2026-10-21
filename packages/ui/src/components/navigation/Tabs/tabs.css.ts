// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'

export const tab = style({
  font: 'inherit',
  color: 'var(--text-muted)',
  background: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
  padding: '0.625rem 0.75rem',
  border: 0,
  borderBottom: '2px solid transparent',
  transition: 'color 100ms ease, border-color 100ms ease',
  selectors: {
    '&[aria-selected="true"]': {
      color: 'var(--text-primary)',
      borderBottomColor: 'var(--selection-color)'
    },
    '&:hover': { color: 'var(--text-primary)' },
    '&:focus-visible': {
      outline: '2px solid var(--selection-color)',
      outlineOffset: '-2px'
    }
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } }
})
