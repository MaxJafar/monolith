import { createContext, useContext, useEffect, useState } from 'react'
import { Socket, io } from 'socket.io-client'

import { refreshAccessToken } from '../client/axios'
import { getAccessToken, subscribeAccessToken } from '../client/tokenStore'
import { useAPIEndpoint } from './APIEndpointProvider'
import { resolveSocketUrl } from './socketUrl'

const SocketContext = createContext<Socket | null>(null)

export interface SocketEvent<
  T,
  P extends string | number | Record<string, string | number> = string
> {
  taskId: string
  module: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  data?: T
  error?: string
  progress?: P
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const apiHost = useAPIEndpoint()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io(resolveSocketUrl(apiHost, window.location.origin), {
      autoConnect: false,
      transports: ['websocket'],
      auth: callback => callback({ token: getAccessToken() })
    })
    const reconnect = () => {
      newSocket.disconnect()
      if (getAccessToken()) newSocket.connect()
    }
    const unsubscribe = subscribeAccessToken(reconnect)
    let refreshing = false
    let lastRefresh = 0
    const recover = async () => {
      if (refreshing || !getAccessToken() || Date.now() - lastRefresh < 30_000)
        return
      lastRefresh = Date.now()
      refreshing = true
      try {
        if (await refreshAccessToken(apiHost)) newSocket.connect()
      } catch {
        /* Reconnect retries when connectivity returns. */
      } finally {
        refreshing = false
      }
    }
    newSocket.on('disconnect', reason => {
      if (reason === 'io server disconnect') void recover()
    })
    newSocket.on('connect_error', error => {
      if (/auth|token|session|expired/i.test(error.message)) void recover()
    })
    reconnect()
    setSocket(newSocket)

    return () => {
      unsubscribe()
      newSocket.removeAllListeners()
      newSocket.disconnect()
      setSocket(null)
    }
  }, [apiHost])

  return <SocketContext value={socket}>{children}</SocketContext>
}

export function useSocketContext(): Socket {
  const context = useContext(SocketContext)

  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }

  return context
}
