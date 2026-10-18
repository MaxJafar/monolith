import { globalTaskPool } from '@functions/socketio/taskPool'
import { Server } from 'socket.io'

import { setupRoomsRealtime } from '../../../lib/rooms/realtime'
import { listenDeviceRevocations } from '../../drizzle'
import { verifyApplicationToken } from '../deviceSession'

export function setupSocket(io: Server) {
  setupRoomsRealtime(io)
  void listenDeviceRevocations(session => {
    io.in(`device:${session}`).disconnectSockets(true)
  }).catch(error => {
    console.error('Device revocation listener unavailable', error)
    io.disconnectSockets(true)
  })
  // QR Login namespace - no authentication required
  // This allows unauthenticated desktop clients to listen for login approval
  const qrLoginNamespace = io.of('/qr-login')

  qrLoginNamespace.on('connection', socket => {
    // Join a QR session room
    socket.on('joinQRSession', (sessionId: string) => {
      // Validate sessionId format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      if (!uuidRegex.test(sessionId)) {
        socket.emit('error', { message: 'Invalid session ID format' })

        return
      }

      socket.join(`qr-session:${sessionId}`)
      socket.emit('joinedQRSession', { sessionId })
    })

    // Leave a QR session room
    socket.on('leaveQRSession', (sessionId: string) => {
      socket.leave(`qr-session:${sessionId}`)
    })
  })

  // Main namespace - authenticated connections only
  io.use(async (socket, next) => {
    const bearerToken = socket.handshake.auth.token as string

    if (!bearerToken) {
      next(new Error('Authorization token is required'))

      return
    }

    try {
      const identity = await verifyApplicationToken(bearerToken)
      socket.data.userId = identity.sub
      socket.data.deviceSessionId = identity.dsid
      socket.data.expiresAt = identity.exp! * 1000
      if (identity.dsid) await socket.join(`device:${identity.dsid}`)
      next()
    } catch {
      next(new Error('Invalid authorization credentials'))
    }
  })

  io.on('connection', socket => {
    const validate = async () => {
      try {
        await verifyApplicationToken(socket.handshake.auth.token as string)
        return true
      } catch {
        socket.disconnect(true)
        return false
      }
    }
    socket.use(async (_packet, next) => {
      if (await validate()) next()
      else next(new Error('Authentication expired'))
    })
    // Notification loss and quiet sockets cannot retain an expired credential.
    const revalidate = setInterval(() => {
      void validate()
    }, 15_000)
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.expiresAt - Date.now())
    )
    socket.on('disconnect', () => {
      clearInterval(revalidate)
      clearTimeout(expiry)
    })
    for (const task in globalTaskPool) {
      const taskData = globalTaskPool[task]

      socket.emit('taskPoolUpdate', {
        taskId: task,
        ...taskData
      })
    }
  })
}
