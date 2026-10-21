// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo
} from 'react'
import { type Socket, io } from 'socket.io-client'

import { getAccessToken } from '../client/tokenStore'
import { useAPIEndpoint } from './APIEndpointProvider'
import { attachSocketSession } from './socketSession'
import { resolveSocketUrl } from './socketUrl'

export interface SocketEvent<
  Data,
  Progress extends string | number | Record<string, string | number> = string
> {
  taskId: string
  module: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  data?: Data
  progress?: Progress
  error?: string
}
const SocketContext = createContext<Socket | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const host = useAPIEndpoint()
  const socket = useMemo(
    () =>
      io(
        resolveSocketUrl(
          host,
          typeof location === 'undefined' ? host : location.origin
        ),
        {
          autoConnect: false,
          transports: ['websocket'],
          auth: reply => reply({ token: getAccessToken() })
        }
      ),
    [host]
  )
  useEffect(() => attachSocketSession(socket, host), [socket, host])
  return <SocketContext value={socket}>{children}</SocketContext>
}
export function useSocketContext(): Socket {
  const socket = useContext(SocketContext)
  if (!socket) throw new Error('useSocketContext requires a SocketProvider')
  return socket
}
