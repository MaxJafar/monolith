import { afterEach, describe, expect, it, vi } from 'vitest'

import { withSessionRefreshLock } from './refreshLock'

afterEach(() => vi.unstubAllGlobals())

describe('shared refresh cookie coordination', () => {
  it('uses the same browser lock for separate refresh callers', async () => {
    let queue: Promise<unknown> = Promise.resolve()
    let active = 0
    let maximum = 0

    const names: string[] = []
    vi.stubGlobal('navigator', {
      locks: {
        request(name: string, action: () => Promise<unknown>) {
          names.push(name)
          const result = queue.then(action)
          queue = result.catch(() => undefined)

          return result
        }
      }
    })
    const action = async () => {
      active++
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      active--

      return 'rotated'
    }

    expect(
      await Promise.all([
        withSessionRefreshLock(action),
        withSessionRefreshLock(action)
      ])
    ).toEqual(['rotated', 'rotated'])
    expect(names).toEqual([
      'zillionos:session-refresh',
      'zillionos:session-refresh'
    ])
    expect(maximum).toBe(1)
  })

  it('serializes in one window without Web Locks and releases failed work', async () => {
    vi.stubGlobal('navigator', {})
    const order: string[] = []
    const first = withSessionRefreshLock(async () => {
      order.push('first')
      await Promise.resolve()
      throw new Error('Expired cookie')
    })
    const second = withSessionRefreshLock(async () => {
      order.push('second')

      return 'next'
    })

    await expect(first).rejects.toThrow('Expired cookie')
    await expect(second).resolves.toBe('next')
    expect(order).toEqual(['first', 'second'])
  })
})
