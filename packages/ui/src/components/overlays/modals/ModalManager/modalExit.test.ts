import { afterEach, describe, expect, it, vi } from 'vitest'

import { scheduleModalExit } from './modalExit'

describe('Modal removal without a browser transition event', () => {
  afterEach(() => vi.useRealTimers())

  it('retains a normal closing modal through its fade, then removes it', () => {
    vi.useFakeTimers()

    const remove = vi.fn()
    scheduleModalExit(remove, false)
    vi.advanceTimersByTime(200)
    expect(remove).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(remove).toHaveBeenCalledOnce()
  })

  it('removes a reduced-motion modal without waiting for an animation', () => {
    vi.useFakeTimers()

    const remove = vi.fn()
    scheduleModalExit(remove, true)
    vi.advanceTimersByTime(0)
    expect(remove).toHaveBeenCalledOnce()
  })

  it('cancels removal when the modal has already unmounted', () => {
    vi.useFakeTimers()

    const remove = vi.fn()
    const cleanup = scheduleModalExit(remove, false)
    cleanup()
    vi.runAllTimers()
    expect(remove).not.toHaveBeenCalled()
  })
})
