import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import getBrowserInfo from './getBrowserInfo'
import { watchQRSession } from './qrConnection'

const start = new Date('2026-10-17T12:00:00Z')
const expiry = new Date(start.getTime() + 60_000).toISOString()

function ports() {
  return {
    status: vi.fn().mockResolvedValue({ status: 'pending', expiresAt: expiry }),
    claim: vi.fn().mockResolvedValue({ accessToken: 'claimed-token' }),
    countdown: vi.fn(),
    claiming: vi.fn(),
    approved: vi.fn().mockResolvedValue(undefined),
    expired: vi.fn(),
    error: vi.fn()
  }
}
beforeEach(() => {
  vi.useFakeTimers()

  vi.setSystemTime(start)
})
afterEach(() => {
  vi.clearAllTimers()

  vi.useRealTimers()
})

describe('QR sign-in connection lifecycle', () => {
  it('claims once when a socket notification races a poll response', async () => {
    const events = ports()

    let deliver!: (value: { status: string; accessToken: string }) => void
    events.status.mockImplementation(
      () =>
        new Promise(resolve => {
          deliver = resolve
        })
    )
    const watcher = watchQRSession(expiry, events)
    const claim = watcher.notifyApproval()
    deliver({ status: 'approved', accessToken: 'notification-token' })
    await watcher.notifyApproval()
    await claim
    expect(events.claim).toHaveBeenCalledTimes(1)
    expect(events.approved).toHaveBeenCalledWith('claimed-token')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events.status).toHaveBeenCalledTimes(1)
  })

  it('stops after expiration and never claims after disposal', async () => {
    const events = ports()
    const watcher = watchQRSession(
      new Date(start.getTime() - 1).toISOString(),
      events
    )
    await watcher.notifyApproval()
    expect(events.expired).toHaveBeenCalledOnce()
    expect(events.status).not.toHaveBeenCalled()
    expect(events.claim).not.toHaveBeenCalled()
  })

  it('ignores a late status response after the modal is closed', async () => {
    const events = ports()

    let deliver!: (value: { status: string }) => void
    events.status.mockImplementation(
      () =>
        new Promise(resolve => {
          deliver = resolve
        })
    )
    const watcher = watchQRSession(expiry, events)
    watcher.dispose()
    deliver({ status: 'approved' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events.claim).not.toHaveBeenCalled()
    expect(events.status).toHaveBeenCalledTimes(1)
  })

  it('retries transient poll failures but reports a claim failure once', async () => {
    const events = ports()
    events.status.mockRejectedValueOnce(new Error('offline'))
    const watcher = watchQRSession(expiry, events)
    await vi.advanceTimersByTimeAsync(3100)
    expect(events.status).toHaveBeenCalledTimes(2)
    events.claim.mockRejectedValueOnce(new Error('already consumed'))
    await watcher.notifyApproval()
    expect(events.error).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events.status).toHaveBeenCalledTimes(2)
  })
})

it('recognizes Android, iOS and Chromium-based browser variants before generic signatures', () => {
  expect(getBrowserInfo('Linux; Android 15 Chrome/130 Safari/537')).toBe(
    'Chrome on Android'
  )
  expect(getBrowserInfo('iPhone; Mac OS X CriOS/130 Safari/605')).toBe(
    'Chrome on iOS'
  )
  expect(getBrowserInfo('Windows Chrome/130 Safari/537 Edg/130')).toBe(
    'Edge on Windows'
  )
  expect(getBrowserInfo('Windows Chrome/130 OPR/115')).toBe('Opera on Windows')
})
