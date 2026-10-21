// SPDX-License-Identifier: 0BSD
import type { Express } from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

import { CORS_ALLOWED_ORIGINS } from '../../routes/constants/corsAllowedOrigins'
import { setupSocket } from './setupSocket'

export default function createSocketServer(
  app: Express
): ReturnType<typeof createServer> {
  const http = createServer(app)
  app.request.io = new Server(http, {
    cors: {
      origin: (origin, accept) =>
        CORS_ALLOWED_ORIGINS.includes(origin ?? '')
          ? accept(null, true)
          : accept(new Error('Not allowed by CORS'))
    }
  })
  setupSocket(app.request.io)
  return http
}
