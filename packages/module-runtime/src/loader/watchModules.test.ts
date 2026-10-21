// SPDX-License-Identifier: 0BSD
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { serverAlias } from './registerDevResolverHooks'
import { watchModules } from './watchModules'

const mock = vi.hoisted(() => ({
  events: new Map<string, (...args: any[]) => void>(),
  close: vi.fn(),
  error: vi.fn()
}))
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on(event: string, handler: (...args: any[]) => void) {
      mock.events.set(event, handler)
      return this
    },
    close: mock.close
  }))
}))
vi.mock('./logger', () => ({ loaderLogger: { error: mock.error } }))

beforeEach(() => {
  vi.useFakeTimers()
  mock.events.clear()
  mock.close.mockReset().mockResolvedValue(undefined)
  mock.error.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('module watcher lifetime', () => {
  it('debounces edits and repeats after an in-flight reload without overlapping', async () => {
    let release!: () => void
    const reload = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            release = resolve
          })
      )
      .mockResolvedValue(undefined)
    const dispose = watchModules('/fixture', reload)
    mock.events.get('change')!()
    mock.events.get('add')!()
    await vi.advanceTimersByTimeAsync(500)
    expect(reload).toHaveBeenCalledOnce()
    mock.events.get('unlink')!()
    await vi.advanceTimersByTimeAsync(500)
    expect(reload).toHaveBeenCalledOnce()
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).toHaveBeenCalledTimes(2)
    mock.events.get('change')!()
    dispose()
    await vi.advanceTimersByTimeAsync(500)
    expect(reload).toHaveBeenCalledTimes(2)
    expect(mock.close).toHaveBeenCalledOnce()
  })
  it('reports synchronous reload errors without losing later events', async () => {
    const reload = vi
      .fn()
      .mockImplementationOnce(() => {
        throw Error('Failed reload')
      })
      .mockResolvedValue(undefined)
    const dispose = watchModules('/fixture', reload)
    mock.events.get('change')!()
    await vi.advanceTimersByTimeAsync(500)
    expect(mock.error).toHaveBeenCalledWith(
      'Add-on reload failed',
      expect.any(Object)
    )
    mock.events.get('change')!()
    await vi.advanceTimersByTimeAsync(500)
    expect(reload).toHaveBeenCalledTimes(2)
    dispose()
  })
})

describe('development aliases', () => {
  it('resolves within the owning server root and rejects traversal', () => {
    const parent = 'file:///repo/modules/calendar/server/routes/day.ts?v=old'
    expect(serverAlias('@/storage.ts', parent)).toBe(
      'file:///repo/modules/calendar/server/storage.ts'
    )
    expect(() => serverAlias('@/../outside.ts', parent)).toThrow('escapes')
    expect(() => serverAlias('@/%2e%2e/outside.ts', parent)).toThrow('escapes')
    expect(serverAlias('node:fs', parent)).toBeUndefined()
    expect(
      serverAlias('@/outside.ts', 'file:///repo/packages/api/index.ts')
    ).toBeUndefined()
  })
})
