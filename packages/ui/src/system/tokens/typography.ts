// SPDX-License-Identifier: 0BSD
import { themeTokens } from '../token-values'

const textProperties = {
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
  ]
} as const
const numericTokens = <const T extends Record<string, number>>(
  values: T,
  unit = ''
) =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, String(value) + unit])
  ) as Record<keyof T, string>

export const typographyValues = {
  ...textProperties,
  fontSize: themeTokens.fontSize,
  fontWeight: themeTokens.fontWeight,
  lineHeight: {
    ...themeTokens.lineHeight,
    ...numericTokens({
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    })
  },
  letterSpacing: numericTokens(
    {
      tighter: -0.05,
      tight: -0.025,
      normal: 0,
      wide: 0.025,
      wider: 0.05,
      widest: 0.1
    },
    'em'
  ),
  textBoxTrim: {
    normal: 'none',
    start: 'trim-start',
    end: 'trim-end',
    both: 'trim-both'
  }
} as const
