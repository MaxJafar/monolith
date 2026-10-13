import { globalStyle } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'

import { plain, plainDangerous } from './styles/plain.css'
import { primary, primaryDangerous } from './styles/primary.css'
import { secondary, secondaryDangerous } from './styles/secondary.css'
import { tertiary, tertiaryDangerous } from './styles/tertiary.css'

export const buttonRecipe = recipe({
  base: {
    transition:
      'background-color var(--motion-fast) var(--motion-ease), color var(--motion-fast) var(--motion-ease), transform var(--motion-fast) var(--motion-ease), box-shadow var(--motion-fast) var(--motion-ease)',
    selectors: {
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
