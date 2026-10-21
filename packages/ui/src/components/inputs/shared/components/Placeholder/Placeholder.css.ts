// SPDX-License-Identifier: 0BSD
import { recipe } from '@vanilla-extract/recipes'

const tint = {
  default: 'var(--text-muted, var(--color-bg-500))',
  transparent: 'transparent'
}
const variants = (selector: string) =>
  Object.fromEntries(
    Object.entries(tint).map(([name, color]) => [
      name,
      { selectors: { [selector]: { color, opacity: 1 } } }
    ])
  ) as Record<
    keyof typeof tint,
    { selectors: Record<string, { color: string; opacity: number }> }
  >

export const placeholderRecipe = recipe({
  variants: {
    color: variants('&::placeholder'),
    focusColor: variants('&:focus::placeholder')
  },
  defaultVariants: { color: 'default', focusColor: 'default' }
})
