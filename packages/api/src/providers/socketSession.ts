// SPDX-License-Identifier: 0BSD
import type { Socket } from 'socket.io-client'

import { refreshAccessToken } from '../client/axios'
import { getAccessToken, subscribeAccessToken } from '../client/tokenStore'

export function attachSocketSession(socket: Socket, host: string): () => void {
  let active = true
  let refresh: Promise<void> | undefined
  let nextAttempt = 0
  const reconnect = () => {
    socket.disconnect()
    if (active && getAccessToken()) socket.connect()
  }
  const recover = () => {
    if (!active || refresh || !getAccessToken() || Date.now() < nextAttempt)
      return
    nextAttempt = Date.now() + 30_000
    refresh = refreshAccessToken(host)
      .then(ready => {
        if (ready && active && getAccessToken() && !socket.connected)
          socket.connect()
      })
      .catch(() => {})
      .finally(() => {
        refresh = undefined
      })
  }
  const disconnected = (reason: string) => {
    if (reason === 'io server disconnect') recover()
  }
  const rejected = (error: Error) => {
    if (/auth|token|session|expired/i.test(error.message)) recover()
  }
  socket.on('disconnect', disconnected)
  socket.on('connect_error', rejected)
  const unsubscribe = subscribeAccessToken(reconnect)
  reconnect()
  return () => {
    active = false
    unsubscribe()
    socket.removeAllListeners()
    socket.disconnect()
  }
}
