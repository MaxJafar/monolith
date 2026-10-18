import { globalStyle } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'

import { plain, plainDangerous } from './styles/plain.css'
import { primary, primaryDangerous } from './styles/primary.css'
import { secondary, secondaryDangerous } from './styles/secondary.css'
import { tertiary, tertiaryDangerous } from './styles/tertiary.css'

export const buttonRecipe = recipe({
  base: {
    appearance: 'none',
    border: '1px solid transparent',
    fontSize: 'var(--text-sm)',
    lineHeight: '1.35',
    transition:
      'background-color var(--motion-fast) var(--motion-ease), color var(--motion-fast) var(--motion-ease), transform var(--motion-fast) var(--motion-ease), box-shadow var(--motion-fast) var(--motion-ease)',
    selectors: {
      '&[data-variant="primary"]:not(:disabled)': {
        boxShadow: '0 1px 2px #00000012, inset 0 1px 0 #ffffff12'
      },
      '&[data-variant="secondary"]': {
        borderColor: 'var(--border-subtle)',
        backgroundColor:
          'color-mix(in srgb, var(--text-primary) 5%, var(--bg-surface))'
      },
      '&[data-variant="secondary"]:hover:not(:disabled)': {
        borderColor: 'var(--border-medium)',
        backgroundColor:
          'color-mix(in srgb, var(--text-primary) 9%, var(--bg-surface))'
      },
      '&[data-dangerous="true"][data-variant="secondary"]': {
        color: 'var(--color-dangerous)',
        backgroundColor:
          'color-mix(in srgb, var(--color-dangerous) 8%, var(--bg-surface))'
      },
      '&:active:not(:disabled):not([aria-disabled="true"])': {
        transform: 'scale(.98)'
      }
    }
  },
  variants: {
    variant: {
      primary,
      secondary,
      tertiary,
      plain
    },
    dangerous: {
      true: {}
    }
  },
  compoundVariants: [
    {
      variants: { variant: 'primary', dangerous: true },
      style: primaryDangerous
    },
    {
      variants: { variant: 'secondary', dangerous: true },
      style: secondaryDangerous
    },
    {
      variants: { variant: 'tertiary', dangerous: true },
      style: tertiaryDangerous
    },
    {
      variants: { variant: 'plain', dangerous: true },
      style: plainDangerous
    }
  ],
  defaultVariants: {
    variant: 'primary',
    dangerous: false
  }
})

globalStyle(
  `${buttonRecipe.classNames.base}[data-loading-without-icon="true"] > :not([data-loading-indicator="true"])`,
  { opacity: 0 }
)
