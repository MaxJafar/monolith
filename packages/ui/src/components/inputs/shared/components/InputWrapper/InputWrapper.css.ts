// SPDX-License-Identifier: 0BSD
import { style } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'

export const inputWrapperRecipe = recipe({
  base: {
    border: '1px solid var(--border-subtle)',
    transition: 'border-color 120ms ease, background-color 120ms ease',
    selectors: {
      '&:focus-within': {
        borderColor: 'var(--selection-color, var(--color-custom-500))'
      }
    },
    '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } }
  },
  variants: {
    variant: {
      classic: {
        borderRadius: 'var(--radius-md)',
        minHeight: '3.5rem',
        paddingLeft: 'calc(var(--spacing) * 3)',
        paddingRight: 'calc(var(--spacing) * 2)'
      },
      plain: { borderRadius: 'var(--radius-md)' }
    },
    size: { default: {}, small: {} },
    disabled: { true: { opacity: 0.5, cursor: 'not-allowed' }, false: {} },
    hasError: {
      true: {
        borderColor: 'var(--color-dangerous)',
        selectors: {
          '&:focus-within': { borderColor: 'var(--color-dangerous)' }
        }
      },
      false: {}
    }
  },
  compoundVariants: [
    {
      variants: { variant: 'plain', size: 'default' },
      style: { padding: 'calc(var(--spacing) * 4)' }
    },
    {
      variants: { variant: 'plain', size: 'small' },
      style: { padding: 'calc(var(--spacing) * 2)' }
    }
  ],
  defaultVariants: {
    variant: 'classic',
    size: 'default',
    disabled: false,
    hasError: false
  }
})
export const inputWrapperErrorTextStyle = style({ overflowWrap: 'anywhere' })
