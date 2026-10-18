import { describe, expect, it, vi } from 'vitest'

import { resolveModuleAvailability } from './moduleAvailability'

describe('module availability during navigation setup', () => {
  it('keeps unrelated modules available when a permission check rejects', async () => {
    const resolved = await resolveModuleAvailability([
      { name: 'overview' },
      {
        name: 'restricted',
        disabled: async () => {
          throw new Error('offline')
        }
      },
      { name: 'enabled', disabled: async () => false }
    ])
    expect(
      resolved.filter(item => !item.disabled).map(item => item.name)
    ).toEqual(['overview', 'enabled'])
  })

  it('fails closed for both synchronous and asynchronous check failures', async () => {
    const resolved = await resolveModuleAvailability([
      {
        name: 'sync',
        disabled: () => {
          throw new Error('not authorized')
        }
      },
      {
        name: 'async',
        disabled: async () => {
          throw new Error('not authorized')
        }
      }
    ])
    expect(resolved.every(item => item.disabled)).toBe(true)
  })

  it('preserves explicit disabled flags and invokes checks once without mutating entries', async () => {
    const check = vi.fn(async () => true)
    const items = [
      { name: 'flag', disabled: true },
      { name: 'checked', disabled: check }
    ]
    expect(await resolveModuleAvailability(items)).toEqual([
      { name: 'flag', disabled: true },
      { name: 'checked', disabled: true }
    ])
    expect(check).toHaveBeenCalledOnce()
    expect(items[1]?.disabled).toBe(check)
  })
})
