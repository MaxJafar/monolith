// SPDX-License-Identifier: 0BSD
import { recipe } from '@vanilla-extract/recipes'

export const textInputBoxRecipe = recipe({
  base: {
    minWidth: 0,
    width: '100%',
    background: 'transparent',
    border: 0,
    outline: 'none',
    font: 'inherit',
    color: 'inherit'
  },
  variants: {
    variant: {
      classic: {
        padding: 'calc(var(--spacing) * 5) 0 calc(var(--spacing) * 1)',
        minHeight: '3.25rem'
      },
      plain: { padding: 0, minHeight: '1.75rem' }
    },
    size: { default: {}, small: { fontSize: 'var(--text-sm)' } }
  },
  defaultVariants: { variant: 'classic', size: 'default' }
})
