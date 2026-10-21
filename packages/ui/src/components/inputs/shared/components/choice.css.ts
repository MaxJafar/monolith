// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'

export const option = style({
  listStyle: 'none',
  margin: 0,
  padding: '0.5rem 0.625rem',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 0,
  selectors: {
    '&[data-focus]:not([data-disabled]), &:hover:not([data-disabled])': {
      background: 'var(--bg-lifted)'
    },
    '&[data-disabled]': { opacity: 0.45, cursor: 'not-allowed' }
  }
})
export const menu = style({
  zIndex: 9999,
  padding: '0.25rem',
  margin: 0,
  maxHeight: 'min(22rem, var(--anchor-max-height, 60vh))',
  maxWidth: 'calc(100vw - 1rem)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 8px 24px #0003',
  outline: 'none',
  transition: 'opacity 100ms ease, transform 100ms ease',
  selectors: {
    '&:empty': { display: 'none' },
    '&[data-closed]': { opacity: 0, transform: 'translateY(-3px)' }
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } }
})
export const choiceButton = style({
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  width: '100%',
  minWidth: 0,
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: 0,
  selectors: {
    '&:disabled': { cursor: 'not-allowed' },
    '&:focus-visible': {
      outline: '2px solid var(--selection-color)',
      outlineOffset: '2px'
    }
  }
})
