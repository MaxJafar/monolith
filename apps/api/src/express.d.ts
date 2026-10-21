// SPDX-License-Identifier: 0BSD
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Server } from 'socket.io'

import type {
  ConvertMedia,
  GlobalTaskPool,
  MediaConfig
} from '@monolith/server-utils'

declare global {
  namespace Express {
    interface Request {
      db: PostgresJsDatabase
      media?: ConvertMedia<MediaConfig>
      io: Server
      taskPool: GlobalTaskPool
    }
  }
}
