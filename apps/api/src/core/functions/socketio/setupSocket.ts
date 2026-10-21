// SPDX-License-Identifier: 0BSD
import type { Server, Socket } from 'socket.io'

import { setupRoomsRealtime } from '../../../lib/rooms/realtime'
import { listenDeviceRevocations } from '../../drizzle'
import { verifyApplicationToken } from '../deviceSession'
import { globalTaskPool } from './taskPool'

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
function qrConnection(socket: Socket): void {
  socket.on('joinQRSession', (id: unknown) => {
    if (typeof id !== 'string' || !uuid.test(id)) {
      socket.emit('error', { message: 'Invalid session ID format' })
      return
    }
    void socket.join('qr-session:' + id)
    socket.emit('joinedQRSession', { sessionId: id })
  })
  socket.on('leaveQRSession', (id: unknown) => {
    if (typeof id === 'string' && uuid.test(id))
      void socket.leave('qr-session:' + id)
  })
}
function protectedConnection(socket: Socket): void {
  let ended = false
  async function check(): Promise<boolean> {
    if (ended) return false
    try {
      await verifyApplicationToken(socket.handshake.auth.token as string)
      return !ended
    } catch {
      socket.disconnect(true)
      return false
    }
  }
  socket.use(async (_packet, next) => {
    next((await check()) ? undefined : new Error('Authentication expired'))
  })
  const interval = setInterval(() => void check(), 15000)
  const timeout = setTimeout(
    () => socket.disconnect(true),
    Math.max(0, Number(socket.data.expiresAt) - Date.now())
  )
  socket.once('disconnect', () => {
    ended = true
    clearInterval(interval)
    clearTimeout(timeout)
  })
  for (const [taskId, task] of Object.entries(globalTaskPool))
    socket.emit('taskPoolUpdate', { taskId, ...task })
}

export function setupSocket(io: Server): void {
  setupRoomsRealtime(io)
  void listenDeviceRevocations(id =>
    io.in('device:' + id).disconnectSockets(true)
  ).catch(error => {
    console.error('Device revocation listener unavailable', error)
    io.disconnectSockets(true)
  })
  io.of('/qr-login').on('connection', qrConnection)
  io.use(async (socket, next) => {
    const token: unknown = socket.handshake.auth.token
    if (typeof token !== 'string' || !token) {
      next(new Error('Authorization token is required'))
      return
    }
    try {
      const identity = await verifyApplicationToken(token)
      socket.data.userId = identity.sub
      socket.data.deviceSessionId = identity.dsid
      socket.data.expiresAt = identity.exp! * 1000
      if (identity.dsid) await socket.join('device:' + identity.dsid)
      next()
    } catch {
      next(new Error('Invalid authorization credentials'))
    }
  })
  io.on('connection', protectedConnection)
}
