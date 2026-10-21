// SPDX-License-Identifier: 0BSD
import { randomUUID } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'

import { createCache } from '../index'

afterEach(() => vi.useRealTimers())

it('shares a namespace while keeping independently named caches separate', () => {
  const name = randomUUID(),
    first = createCache(name),
    second = createCache(name)
  first.set('entry', { value: 42 })
  expect(second.get('entry')).toBe(first.get('entry'))
  expect(createCache(randomUUID()).has('entry')).toBe(false)
  second.clear()
  expect(first.size).toBe(0)
})
it('applies default TTLs, explicit permanent values and exact expiration boundaries', () => {
  vi.useFakeTimers()
  vi.setSystemTime(10000)
  const cache = createCache(randomUUID(), { stdTTL: 3 })
  cache.set('default', 'expires')
  cache.set('forever', null, 0)
  cache.set('short', false, 1)
  expect(cache.expiryTime('default')).toBe(13000)
  expect(cache.expiryTime('forever')).toBe(0)
  vi.setSystemTime(11000)
  expect(cache.has('short')).toBe(false)
  expect(cache.get('default')).toBe('expires')
  vi.setSystemTime(13000)
  expect(cache.keys()).toEqual(['forever'])
  expect(cache.size).toBe(1)
  expect(cache.expiryTime('default')).toBeUndefined()
})
it('overwrites expiration, preserves reference values and deletes idempotently', () => {
  vi.useFakeTimers()
  vi.setSystemTime(10000)
  const cache = createCache(randomUUID(), { stdTTL: 1 })
  const value = { count: 1 }
  cache.set('value', value)
  value.count++
  expect(cache.get('value')).toEqual({ count: 2 })
  cache.set('value', 3, 0)
  vi.setSystemTime(12000)
  expect(cache.get('value')).toBe(3)
  expect(cache.del('value')).toBe(true)
  expect(cache.del('value')).toBe(false)
})
it('handles unsupported undefined values and rejects invalid TTLs without writing', () => {
  const cache = createCache(randomUUID())
  cache.set('empty', undefined)
  expect(cache.has('empty')).toBe(true)
  expect(cache.get('empty')).toBeNull()
  for (const ttl of [NaN, Infinity, -Infinity])
    expect(() => cache.set('invalid', 1, ttl)).toThrow()
  expect(cache.has('invalid')).toBe(false)
  cache.set('expired', 2, -1)
  expect(cache.get('expired')).toBeUndefined()
})
