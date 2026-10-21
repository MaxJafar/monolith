// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import {
  colorSwatches,
  hexToRgb,
  hsvToHex,
  parseHex,
  rgbToHex,
  rgbToHsv
} from './color'

it('accepts saved colors and shorthand, rejecting malformed or alpha colors', () => {
  expect(parseHex(' #abc ')).toBe('#AABBCC')
  expect(parseHex('6993c3')).toBe('#6993C3')
  for (const value of ['', 'red', '#12345g', '#12345678', '12345', 'url(x)'])
    expect(parseHex(value)).toBeUndefined()
})
it('converts sRGB primaries, greys and arbitrary colors without losing a byte', () => {
  for (const hex of [
    '#000000',
    '#FFFFFF',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#123456',
    '#B883D2',
    '#F0C103'
  ]) {
    expect(rgbToHex(hexToRgb(hex))).toBe(hex)
    expect(hsvToHex(rgbToHsv(hexToRgb(hex)))).toBe(hex)
  }
  expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 })
  expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 })
})
it('clamps invalid numeric input and wraps hue at the ends of the spectrum', () => {
  expect(rgbToHex({ r: -40, g: 300, b: NaN })).toBe('#00FF00')
  expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe('#FF0000')
  expect(hsvToHex({ h: -60, s: 100, v: 100 })).toBe('#FF00FF')
  expect(hsvToHex({ h: 0, s: 200, v: 200 })).toBe('#FF0000')
  expect(hsvToHex({ h: NaN, s: NaN, v: NaN })).toBe('#000000')
})
it('generates a finite selectable palette with no duplicate keys', () => {
  expect(colorSwatches).toHaveLength(30)
  expect(new Set(colorSwatches).size).toBe(30)
  for (const value of colorSwatches) expect(parseHex(value)).toBe(value)
})
