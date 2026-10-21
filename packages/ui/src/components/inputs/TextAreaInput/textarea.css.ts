// SPDX-License-Identifier: 0BSD
import { recipe } from '@vanilla-extract/recipes'

export const textarea = recipe({
  base: {
    font: 'inherit',
    color: 'inherit',
    width: '100%',
    minWidth: 0,
    minHeight: '4rem',
    maxHeight: '32rem',
    border: 0,
    outline: 'none',
    background: 'transparent',
    resize: 'vertical'
  },
  variants: {
    variant: {
      classic: {
        padding: 'calc(var(--spacing) * 6) 0 calc(var(--spacing) * 2)'
      },
      plain: { padding: 0 }
    }
  }
})
