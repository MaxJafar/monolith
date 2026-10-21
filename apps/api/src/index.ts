// SPDX-License-Identifier: 0BSD
import { Command } from 'commander'

import { sweepStagingDir } from '@monolith/file-storage/server'
import { traceRouteStack } from '@monolith/server-utils'

import { PORT } from './core/constants'
import ensureCredentials from './core/functions/initialization/ensureCredentials'
import { LocaleService } from './core/functions/initialization/localeService'
import {
  LOG_LEVELS,
  type LogLevel,
  coreLogger,
  createServiceLogger
} from './core/functions/logging'
import createSocketServer from './core/functions/socketio/createSocketServer'
import './loadEnv'

async function boot(): Promise<void> {
  const command = new Command('monolith-server')
    .description('Monolith workspace service')
    .option(
      '-l, --log-level <level>',
      'Logging verbosity: ' + LOG_LEVELS.join(', '),
      'info'
    )
    .parse()
  const selected = String(command.opts().logLevel).toLowerCase()
  if (!LOG_LEVELS.includes(selected as LogLevel))
    throw new Error('Unsupported log level: ' + selected)
  coreLogger.setLevel(selected as LogLevel)
  ensureCredentials()
  LocaleService.validateAndLoad()
  await sweepStagingDir()

  // Configuration is loaded before the application imports credentials or database services.
  const { default: app } = await import('./core/app')
  const { verifyDatabaseIsolation } = await import('./core/drizzle')
  await verifyDatabaseIsolation()
  const server = createSocketServer(app)
  await new Promise<void>((ready, reject) => {
    server.once('error', reject)
    server.listen(PORT, () => {
      server.off('error', reject)
      ready()
    })
  })
  createServiceLogger('Route Loader').info(
    'Monolith is listening on port ' +
      PORT +
      ' with ' +
      traceRouteStack(app._router.stack).length +
      ' routes'
  )

  const { startNotifications } = await import('./core/notifications')
  const stopNotifications = await startNotifications()
  server.once('close', () => {
    void stopNotifications().catch(error => coreLogger.error(String(error)))
  })
  const shutdown = () => {
    server.close()
    void stopNotifications().then(
      () => process.exit(0),
      error => {
        coreLogger.error(String(error))
        process.exit(1)
      }
    )
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  const { startModuleWatcher } = await import('./core/routes')
  startModuleWatcher()
}
void boot().catch(error => {
  coreLogger.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
