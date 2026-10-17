import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import {
  RESPONSIVE_CONDITIONS,
  tokenizedLayoutProperties,
  tokenizedSpacingProperties,
  vars
} from '@/system'

const typography = defineProperties({
  conditions: RESPONSIVE_CONDITIONS,
  defaultCondition: 'base',
  properties: {
    fontSize: vars.fontSize,
    fontWeight: vars.fontWeight,
    lineHeight: {
      ...vars.lineHeight,
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    },
    textAlign: ['left', 'center', 'right'],
    textDecoration: ['none', 'underline', 'line-through'],
    textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
    textWrap: ['wrap', 'nowrap', 'pretty', 'balance'],
    whiteSpace: [
      'normal',
      'nowrap',
      'pre',
      'pre-line',
      'pre-wrap',
      'break-spaces'
    ],
    wordBreak: ['normal', 'break-all', 'keep-all'],
    overflowWrap: ['normal', 'break-word', 'anywhere'],
    display: [
      'block',
      'inline',
      'inline-block',
      'flex',
      'inline-flex',
      'none',
      'contents'
    ],
    textBoxTrim: {
      normal: 'none',
      start: 'trim-start',
      end: 'trim-end',
      both: 'trim-both'
    }
  }
})
export const textSprinkles = createSprinkles(
  typography,
  tokenizedSpacingProperties,
  tokenizedLayoutProperties
)
export type TextSprinkles = Parameters<typeof textSprinkles>[0]
