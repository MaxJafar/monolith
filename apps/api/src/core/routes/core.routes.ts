import { ROOT_DIR } from '@constants'
import { getPublicKey } from '@functions/encryption'
import corsAnywhere from '@lib/corsAnywhere'
import dayjs from 'dayjs'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import path from 'path'
import z from 'zod'

import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import { addonShop } from '../../lib/modules/shop'
import { db } from '../drizzle'
import endpoints from './endpoints'

const releaseVersion: string = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')
).version

const welcome = endpoints
  .query({
    description: 'Welcome to Monolith API',
    noAuth: true,
    encrypted: false,
    output: {
      OK: z.literal('Welcome to Monolith')
    }
  })
  .callback(async ({ response }) => response.ok('Welcome to Monolith'))

const ping = endpoints
  .mutation({
    description: 'Ping the server',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({
        timestamp: z.number().min(0)
      })
    },
    output: {
      OK: z.string()
    }
  })
  .callback(async ({ body: { timestamp }, response }) =>
    response.ok(`Pong at ${dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')}`)
  )

const status = endpoints
  .query({
    description: 'Get server status',
    noAuth: true,
    encrypted: false,
    rateLimit: false,
    input: {},
    output: {
      OK: z.object({
        environment: z.string(),
        version: z.string(),
        healthy: z.boolean()
      })
    }
  })
  .callback(async ({ response }) => {
    await db.execute(sql`select 1`)
    const installed = await addonShop.directories()
    if (Object.keys(installed).some(id => !ModuleRegistry.isAvailable(id)))
      throw Error('An installed addon failed to start')
    return response.ok({
      environment: process.env.NODE_ENV || 'development',
      version: releaseVersion,
      healthy: true
    })
  })

const encryptionPublicKey = endpoints
  .query({
    description: 'Get server public key for end-to-end encryption',
    noAuth: true,
    encrypted: false,
    input: {},
    output: {
      OK: z.string()
    }
  })
  .callback(async ({ response }) => response.ok(getPublicKey()))

const coreRoutes = defineRoutes({
  '': welcome,
  locales: (await import('@lib/locales')).default,
  user: (await import('@lib/user')).default,
  fonts: (await import('@lib/fonts')).default,
  apiKeys: (await import('@lib/apiKeys')).default,
  auth: (await import('@lib/auth')).default,
  pixabay: (await import('@lib/pixabay')).default,
  locations: (await import('@lib/locations')).default,
  modules: (await import('@lib/modules')).default,
  updates: (await import('@lib/updates')).default,
  ai: (await import('@lib/ai')).default,
  search: (await import('@lib/search')).default,
  rooms: (await import('@lib/rooms')).default,
  entities: (await import('@lib/entities')).default,
  files: (await import('@lib/files')).default,
  ping,
  status,
  corsAnywhere,
  encryptionPublicKey
})

writeContractFileToClient(
  coreRoutes,
  path.resolve(import.meta.dirname, '../../../../../packages/api/src'),
  '.'
)

export default coreRoutes
