import z from 'zod'

import {
  platformUpdateSchema,
  updatePreferencesSchema
} from '@monolith/configs'
import { defineEndpoints, defineRoutes } from '@monolith/server-utils'

import { canManageUpdates, hostUpdate } from './service'

const endpoints = defineEndpoints({})
const status = endpoints
  .query({
    description: 'Get main server release and update progress',
    input: {},
    output: {
      OK: z.object({ state: platformUpdateSchema, canManage: z.boolean() })
    }
  })
  .callback(async ({ res, response }) =>
    response.ok({
      state: await hostUpdate('status'),
      canManage: canManageUpdates(res.locals.userId)
    })
  )

const action = endpoints
  .mutation({
    description: 'Manage verified host updates as a host administrator',
    input: {
      body: z.object({
        action: z.enum(['check', 'download', 'install', 'rollback'])
      })
    },
    output: { OK: platformUpdateSchema }
  })
  .callback(async ({ body, res, response }) => {
    if (!canManageUpdates(res.locals.userId)) return response.forbidden()

    return response.ok(await hostUpdate(body.action))
  })
const settings = endpoints
  .mutation({
    description:
      'Configure automatic host updates and the UTC maintenance hour',
    input: { body: updatePreferencesSchema },
    output: { OK: platformUpdateSchema }
  })
  .callback(async ({ body, res, response }) => {
    if (!canManageUpdates(res.locals.userId)) return response.forbidden()

    return response.ok(await hostUpdate('settings', body))
  })

export default defineRoutes({ status, action, settings })
