// SPDX-License-Identifier: 0BSD
const referenceFamily = <const Names extends readonly string[]>(
  names: Names,
  prefix: string,
  suffix = ''
) =>
  Object.fromEntries(
    names.map(name => [name, `var(--${prefix}-${name}${suffix})`])
  ) as Record<Names[number], string>

const typeSizes = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl'
] as const
const spacingScale = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 12,
  '3xl': 16
} as const

/** Resolve directly against the active theme, including nested appearance scopes. */
export const themeTokens = {
  space: Object.fromEntries(
    Object.entries(spacingScale).map(([name, units]) => [
      name,
      units ? `calc(var(--spacing) * ${units})` : '0'
    ])
  ) as Record<keyof typeof spacingScale, string>,
  radii: {
    none: '0',
    ...referenceFamily(
      ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const,
      'radius'
    ),
    full: '9999px'
  },
  fontSize: referenceFamily(typeSizes, 'text'),
  lineHeight: referenceFamily(typeSizes, 'text', '--line-height'),
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' }
} as const
