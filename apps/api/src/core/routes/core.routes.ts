// SPDX-License-Identifier: 0BSD
import { ROOT_DIR } from '@constants'
import { getPublicKey } from '@functions/encryption'
import dayjs from 'dayjs'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import z from 'zod'

import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import { addonShop } from '../../lib/modules/shop'
import { db } from '../drizzle'
import endpoints from './endpoints'

const manifest = JSON.parse(
  readFileSync(join(ROOT_DIR, 'package.json'), 'utf8')
)
if (typeof manifest.version !== 'string')
  throw Error('The server package version is missing')

const diagnostics = {
  '': endpoints
    .query({
      description: 'Identify the workspace API',
      noAuth: true,
      encrypted: false,
      output: { OK: z.literal('Welcome to Monolith') }
    })
    .callback(async ({ response }) => response.ok('Welcome to Monolith')),
  status: endpoints
    .query({
      description: 'Check database and addon readiness',
      noAuth: true,
      encrypted: false,
      rateLimit: false,
      output: {
        OK: z.object({
          environment: z.string(),
          version: z.string(),
          healthy: z.boolean()
        })
      }
    })
    .callback(async ({ response }) => {
      const [, installed] = await Promise.all([
        db.execute(sql`select 1`),
        addonShop.directories()
      ])
      const unavailable = Object.keys(installed).filter(
        id => !ModuleRegistry.isAvailable(id)
      )
      if (unavailable.length)
        throw Error('Addon startup incomplete: ' + unavailable.join(', '))
      return response.ok({
        environment: process.env.NODE_ENV ?? 'development',
        version: manifest.version as string,
        healthy: true
      })
    }),
  ping: endpoints
    .mutation({
      description: 'Echo a timestamp for connectivity diagnostics',
      noAuth: true,
      encrypted: false,
      input: { body: z.object({ timestamp: z.number().min(0) }) },
      output: { OK: z.string() }
    })
    .callback(async context =>
      context.response.ok(
        'Pong at ' + dayjs(context.body.timestamp).format('YYYY-MM-DD HH:mm:ss')
      )
    ),
  encryptionPublicKey: endpoints
    .query({
      description: 'Read the request encryption public key',
      noAuth: true,
      encrypted: false,
      output: { OK: z.string() }
    })
    .callback(async context => context.response.ok(getPublicKey()))
}

// Route names are the public wire protocol, independent of the implementation modules.
const routes = defineRoutes({
  ...diagnostics,
  locales: (await import('@lib/locales')).default,
  user: (await import('@lib/user')).default,
  auth: (await import('@lib/auth')).default,
  files: (await import('@lib/files')).default,
  apiKeys: (await import('@lib/apiKeys')).default,
  fonts: (await import('@lib/fonts')).default,
  modules: (await import('@lib/modules')).default,
  updates: (await import('@lib/updates')).default,
  rooms: (await import('@lib/rooms')).default,
  entities: (await import('@lib/entities')).default,
  search: (await import('@lib/search')).default,
  ai: (await import('@lib/ai')).default,
  locations: (await import('@lib/locations')).default,
  pixabay: (await import('@lib/pixabay')).default,
  corsAnywhere: (await import('@lib/corsAnywhere')).default
})
writeContractFileToClient(
  routes,
  resolve(import.meta.dirname, '../../../../../packages/api/src'),
  '.'
)
export default routes
