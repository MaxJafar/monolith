// SPDX-License-Identifier: 0BSD
import type { Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAccessToken, setAccessToken } from '../client/tokenStore'
import { attachSocketSession } from './socketSession'

const refresh = vi.hoisted(() => vi.fn())
vi.mock('../client/axios', () => ({ refreshAccessToken: refresh }))
function fixture() {
  const handlers = new Map<string, (...args: any[]) => void>()
  const socket = {
    connected: false,
    on: vi.fn((name, handler) => {
      handlers.set(name, handler)
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(() => {
      handlers.clear()
    })
  }
  return {
    socket,
    emit: (name: string, value: unknown) => handlers.get(name)?.(value)
  }
}
beforeEach(() => {
  clearAccessToken()
  refresh.mockReset()
})
afterEach(() => {
  clearAccessToken()
})

describe('socket session lifecycle', () => {
  it('connects after sign-in, disconnects on sign-out and unsubscribes on cleanup', () => {
    const { socket } = fixture()
    const close = attachSocketSession(
      socket as unknown as Socket,
      'https://example.invalid'
    )
    expect(socket.connect).not.toHaveBeenCalled()
    setAccessToken('token')
    expect(socket.connect).toHaveBeenCalledTimes(1)
    clearAccessToken()
    expect(socket.disconnect).toHaveBeenCalledTimes(3)
    close()
    setAccessToken('later')
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })
  it('shares recovery attempts and does not reconnect a closed socket', async () => {
    const { socket, emit } = fixture()
    setAccessToken('expired')
    let complete!: (value: boolean) => void
    refresh.mockImplementation(
      () =>
        new Promise(resolve => {
          complete = resolve
        })
    )
    const close = attachSocketSession(
      socket as unknown as Socket,
      'https://example.invalid'
    )
    emit('connect_error', new Error('Token expired'))
    emit('disconnect', 'io server disconnect')
    expect(refresh).toHaveBeenCalledTimes(1)
    close()
    complete(true)
    await Promise.resolve()
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })
  it('ignores ordinary network failures and limits repeated auth recovery', async () => {
    const { socket, emit } = fixture()
    setAccessToken('token')
    refresh.mockResolvedValue(false)
    const close = attachSocketSession(
      socket as unknown as Socket,
      'https://example.invalid'
    )
    emit('connect_error', new Error('Network unavailable'))
    expect(refresh).not.toHaveBeenCalled()
    emit('connect_error', new Error('Unauthorized'))
    await Promise.resolve()
    await Promise.resolve()
    emit('connect_error', new Error('Unauthorized'))
    expect(refresh).toHaveBeenCalledTimes(1)
    close()
  })
})
