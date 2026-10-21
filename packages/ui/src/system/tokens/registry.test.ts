// SPDX-License-Identifier: 0BSD
import { describe, expect, it } from 'vitest'

import {
  colorWithOpacity,
  isColorWithOpacity
} from '../colors/color-with-opacity'
import { normalizeGridSpan, normalizeGridTrack } from '../grid-utils'
import { escapeCssClassName } from '../responsive/utils/escapeCssClassName'
import { themeTokens } from '../token-values'
import {
  expandAliases,
  layoutAliases,
  roundingAliases,
  spacingAliases
} from './registry'

describe('theme and layout contract', () => {
  it('keeps axis values when an edge overrides only one breakpoint', () => {
    expect(
      expandAliases(spacingAliases, {
        px: { base: 'sm', md: 'lg' },
        pl: { md: 'none' },
        p: 'xs'
      })
    ).toEqual({
      padding: { base: 'xs' },
      paddingLeft: { base: 'sm', md: 'none' },
      paddingRight: { base: 'sm', md: 'lg' }
    })
    expect(
      expandAliases(spacingAliases, { my: 'md', mb: { print: 'none' } })
    ).toEqual({
      marginTop: { base: 'md' },
      marginBottom: { base: 'md', print: 'none' }
    })
  })
  it('drops unknown aliases and conditions without emitting invalid CSS', () => {
    expect(
      expandAliases(layoutAliases, {
        position: { base: 'relative', evil: 'fixed' },
        oops: 'auto'
      })
    ).toEqual({ position: { base: 'relative' } })
    expect(
      expandAliases(roundingAliases, { r: 'sm', rtl: { md: 'full' } })
    ).toEqual({
      borderRadius: { base: 'sm' },
      borderTopLeftRadius: { md: 'full' }
    })
  })
  it('uses live theme properties for nested appearance scopes', () => {
    expect(themeTokens.fontSize.base).toBe('var(--text-base)')
    expect(themeTokens.space.md).toBe('calc(var(--spacing) * 4)')
    expect(themeTokens.lineHeight.lg).toBe('var(--text-lg--line-height)')
  })
  it('normalizes valid grid counts and preserves explicit CSS tracks', () => {
    expect(normalizeGridTrack(3)).toBe('repeat(3, minmax(0, 1fr))')
    expect(normalizeGridSpan(2)).toBe('span 2')
    expect(normalizeGridTrack('auto 1fr')).toBe('auto 1fr')
    for (const count of [0, -1, NaN, Infinity, 1.5])
      expect(() => normalizeGridTrack(count)).toThrow(RangeError)
  })
  it('escapes leading digits, punctuation and single hyphens for selectors', () => {
    expect(escapeCssClassName('2xl')).toBe('\\32 xl')
    expect(escapeCssClassName('a:b')).toBe('a\\3a b')
    expect(escapeCssClassName('-')).toBe('\\2d ')
    expect(escapeCssClassName('monolith-name')).toBe('monolith-name')
  })
  it('recognizes opacity values from a separately loaded addon without instanceof', () => {
    const shade = colorWithOpacity('bg-500', '50%')
    expect(String(shade)).toContain('50%, transparent)')
    expect(Object.isFrozen(shade)).toBe(true)
    expect(isColorWithOpacity({ ...shade })).toBe(true)
    expect(isColorWithOpacity({ token: 'bg-500', opacity: '50%' })).toBe(false)
    expect(() => colorWithOpacity('__proto__' as never, '50%')).toThrow(
      TypeError
    )
    expect(() => colorWithOpacity('bg-500', '300%' as never)).toThrow(TypeError)
  })
})
