import { describe, expect, it } from 'vitest'

import {
  add,
  cmp,
  div,
  fixed,
  mul,
  mulRound,
  normalize,
  parseInput,
  round,
  sub,
  sum
} from './money'

describe('exact decimals', () => {
  it('adds without floating point drift', () => {
    expect(add('0.1', '0.2')).toBe('0.3')
    expect(sum(Array.from({ length: 10 }, () => '0.1'))).toBe('1')
    expect(sub('100', '99.99')).toBe('0.01')
    expect(add('-5.50', '5.5')).toBe('0')
  })

  it('normalizes canonical strings', () => {
    expect(normalize('0012.3400')).toBe('12.34')
    expect(normalize('-0.000')).toBe('0')
    expect(normalize('.5')).toBe('0.5')
  })

  it('multiplies exactly and rounds once, half away from zero', () => {
    expect(mul('19.99', '3')).toBe('59.97')
    expect(mul('0.00000001', '0.00000001')).toBe('0.0000000000000001')
    expect(round('2.345', 2)).toBe('2.35')
    expect(round('-2.345', 2)).toBe('-2.35')
    expect(round('2.344999', 2)).toBe('2.34')
    expect(mulRound('20', '1.18', 2)).toBe('23.6')
  })

  it('divides to a requested precision', () => {
    expect(div('1', '3', 4)).toBe('0.3333')
    expect(div('2', '3', 2)).toBe('0.67')
    expect(div('-2', '3', 2)).toBe('-0.67')
    expect(div('100', '1.7', 2)).toBe('58.82')
    expect(() => div('1', '0', 2)).toThrow()
  })

  it('writes fixed fraction digits', () => {
    expect(fixed('12.5', 2)).toBe('12.50')
    expect(fixed('-0.001', 2)).toBe('0.00')
    expect(fixed('1234.5678', 0)).toBe('1235')
  })

  it('compares across scales', () => {
    expect(cmp('1.10', '1.1')).toBe(0)
    expect(cmp('-1', '0.5')).toBe(-1)
    expect(cmp('10', '9.999')).toBe(1)
  })

  it('reads typed amounts in common notations', () => {
    expect(parseInput('1 234,50')).toBe('1234.5')
    expect(parseInput('1,234.50')).toBe('1234.5')
    expect(parseInput('1.234,50')).toBe('1234.5')
    expect(parseInput('12,5')).toBe('12.5')
    expect(parseInput('1,234')).toBe('1234')
    expect(parseInput('abc')).toBeNull()
    expect(parseInput('')).toBeNull()
  })
})
