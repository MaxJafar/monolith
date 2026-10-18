import { describe, expect, it } from 'vitest'

import ClientError from '../response/ClientError'
import { requireResult } from './requireResult'

describe('requireResult', () => {
  it('returns present results without replacing falsy values', () => {
    const row = { id: 'a' }

    expect(requireResult(row)).toBe(row)
    expect(requireResult(0)).toBe(0)
    expect(requireResult(false)).toBe(false)
    expect(requireResult(null)).toBeNull()
  })

  it('reports a missing row as a client-visible not found error', () => {
    try {
      requireResult(undefined)
      expect.fail('A missing database row must fail')
    } catch (error) {
      expect(error).toBeInstanceOf(ClientError)
      expect(error).toMatchObject({ code: 404, message: 'Record not found' })
    }
  })

  it('supports a server failure for an insert that returns no row', () => {
    expect(() =>
      requireResult(undefined, 'Insert returned no row', 500)
    ).toThrow('Insert returned no row')

    try {
      requireResult(undefined, 'Insert returned no row', 500)
    } catch (error) {
      expect(error).toMatchObject({ code: 500 })
    }
  })
})
