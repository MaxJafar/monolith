import { style } from '@vanilla-extract/css'

const line =
  '1px solid var(--monolith-divide-color-resolved, var(--color-bg-200))'
export const divideVariants = {
  y: style({
    selectors: { '&:not(:first-child)': { borderBlockStart: line } }
  }),
  x: style({
    selectors: { '&:not(:first-child)': { borderInlineStart: line } }
  })
}
export type DivideAxis = keyof typeof divideVariants
