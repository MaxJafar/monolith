import { style } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'

import { COLORS, vars } from '@/system'

export const inputWrapperRecipe = recipe({
  variants: {
    variant: {
      classic: {
        borderRadius: vars.radii.md,
        minHeight: '56px'
      },
      plain: {
        borderRadius: vars.radii.lg
      }
    },
    size: {
      default: {},
      small: {}
    },
    hasError: {
      true: {
        borderColor: COLORS['dangerous'],
        outlineColor: COLORS['dangerous'],
        selectors: {
          '&:focus-within': {
            borderColor: COLORS['dangerous']
          }
        }
      },
      false: {
        borderColor: COLORS['bg-500'],
        selectors: {
          '&:focus-within': {
            borderColor: COLORS['primary'],
            outline: '2px solid var(--accent-teal)',
            outlineOffset: '2px'
          }
        }
      }
    },
    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: 'none'
      },
      false: {
        cursor: 'text'
      }
    }
  },
  compoundVariants: [
    {
      variants: { variant: 'plain', size: 'default' },
      style: {
        padding: vars.space.md
      }
    },
    {
      variants: { variant: 'plain', size: 'small' },
      style: {
        padding: vars.space.sm
      }
    }
  ],
  defaultVariants: {
    variant: 'classic',
    size: 'default',
    hasError: false,
    disabled: false
  }
})

export const inputWrapperErrorTextStyle = style({
  color: COLORS['dangerous']
})
