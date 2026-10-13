import { PORT, ROOT_DIR } from '@constants'
import ensureCredentials from '@functions/initialization/ensureCredentials'
import { LocaleService } from '@functions/initialization/localeService'
import {
  LOG_LEVELS,
  type LogLevel,
  coreLogger,
  createServiceLogger
} from '@functions/logging'
import createSocketServer from '@functions/socketio/createSocketServer'
import chalk from 'chalk'
import { program } from 'commander'
import dotenv from 'dotenv'
import type { Express } from 'express'
import { createServer } from 'node:http'
import path from 'node:path'

import { sweepStagingDir } from '@lifeforge/file-storage/server'
import { traceRouteStack } from '@lifeforge/server-utils'

import './loadEnv'

dotenv.config({
  path: path.join(ROOT_DIR, 'env/.env.local'),
  quiet: true
})

// Parse CLI arguments
program
  .name('monolith-server')
  .description('monolith API Server')
  .option(
    '-l, --log-level <level>',
    `Set log level (${LOG_LEVELS.join(', ')})`,
    'info'
  )
  .parse()

const opts = program.opts<{ logLevel: string }>()

if (opts.logLevel) {
  const level = opts.logLevel.toLowerCase()

  if (LOG_LEVELS.includes(level as LogLevel)) {
    coreLogger.setLevel(level as LogLevel)
  } else {
    console.error(
      `Invalid log level: ${opts.logLevel}. Valid levels: ${LOG_LEVELS.join(', ')}`
    )
    process.exit(1)
  }
}

function startServer(
  server: ReturnType<typeof createServer>,
  app: Express
): void {
  server.listen(PORT, () => {
    const routes = traceRouteStack(app._router.stack)

    createServiceLogger('Route Loader').info(
      `Registered routes: ${chalk.green(routes.length)}`
    )
    createServiceLogger('Route Loader').info(
      `REST API server running on port ${chalk.green(PORT)}`
    )
  })
}

async function main(): Promise<void> {
  createServiceLogger('Database').info(`DB initialization successful`)

  await sweepStagingDir()

  // Import the app after loading env so module-level env reads (e.g. JWT secret)
  // are populated regardless of how the server is spawned.
  const { default: app } = await import('./core/app')
  const { verifyDatabaseIsolation } = await import('./core/drizzle')
  await verifyDatabaseIsolation()

  LocaleService.validateAndLoad()
  ensureCredentials()

  const server = createSocketServer(app)

  startServer(server, app)

  const { db } = await import('./core/drizzle')
  const { users } = await import('./lib/user/schema.drizzle')
  const { asc, gt } = await import('drizzle-orm')
  const { startGymPushDispatcher } =
    await import('../../../modules/zillion--gym/server/push')
  const { startTechLabDispatcher } =
    await import('../../../modules/zillion--tech-lab/server/collectors')
  const pushLogger = createServiceLogger('Gym notifications')
  const techLabLogger = createServiceLogger('Tech Lab monitoring')

  let pushOwnerCursor: string | null = null
  let techLabOwnerCursor: string | null = null

  const techLab = startTechLabDispatcher({
    db: db as unknown as import('../../../modules/zillion--tech-lab/server/store').TechLabDatabase,
    async listOwners(limit) {
      let owners = await db
        .select({ id: users.id })
        .from(users)
        .where(
          techLabOwnerCursor ? gt(users.id, techLabOwnerCursor) : undefined
        )
        .orderBy(asc(users.id))
        .limit(limit)

      if (!owners.length && techLabOwnerCursor) {
        techLabOwnerCursor = null
        owners = await db
          .select({ id: users.id })
          .from(users)
          .orderBy(asc(users.id))
          .limit(limit)
      }
      techLabOwnerCursor = owners.at(-1)?.id ?? null

      return owners.map(owner => owner.id)
    },
    onError: code => techLabLogger.warn(code)
  })

  const gymPush = startGymPushDispatcher({
    db: db as unknown as import('../../../modules/zillion--gym/server/store').GymDatabase,
    async listOwners(limit) {
      let owners = await db
        .select({ id: users.id })
        .from(users)
        .where(pushOwnerCursor ? gt(users.id, pushOwnerCursor) : undefined)
        .orderBy(asc(users.id))
        .limit(limit)

      if (!owners.length && pushOwnerCursor) {
        pushOwnerCursor = null
        owners = await db
          .select({ id: users.id })
          .from(users)
          .orderBy(asc(users.id))
          .limit(limit)
      }
      pushOwnerCursor = owners.at(-1)?.id ?? null

      return owners.map(owner => owner.id)
    },
    onError: code => pushLogger.warn(code)
  })
  server.once('close', () => {
    techLab.stop()
    void gymPush.stop()
  })
  const stopNotifications = () => {
    techLab.stop()
    void gymPush.stop().finally(() => process.exit(0))
  }
  process.once('SIGINT', stopNotifications)
  process.once('SIGTERM', stopNotifications)

  // Routes are already loaded via `./core/app`; start watching for module changes.
  const { startModuleWatcher } = await import('./core/routes')

  startModuleWatcher()
}

main()
