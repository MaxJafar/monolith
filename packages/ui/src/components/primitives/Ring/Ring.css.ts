import { style } from '@vanilla-extract/css'

export const ring = style({
  outlineStyle: 'solid',
  outlineWidth: 'var(--monolith-ring-width, 3px)',
  outlineOffset: 'var(--monolith-ring-offset-width, 0px)',
  outlineColor: 'var(--monolith-ring-color-resolved, var(--color-custom-500))'
})
