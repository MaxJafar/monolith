import z from 'zod'

import {
  addonIdSchema,
  addonJobSchema,
  addonReleaseSchema
} from '@monolith/configs'

import endpoints from '../endpoints'
import { addonShop, canManageAddons } from '../shop'

export const catalog = endpoints
  .query({
    description: 'Browse verified addon releases and installation progress',
    input: {},
    output: {
      OK: z.object({
        releases: z.array(addonReleaseSchema),
        jobs: z.array(addonJobSchema),
        configured: z.boolean(),
        canManage: z.boolean(),
        error: z.string(),
        hostVersion: z.string(),
        managed: z.array(z.string())
      })
    }
  })
  .callback(async ({ res, response }) =>
    response.ok({
      ...(await addonShop.snapshot()),
      canManage: canManageAddons(res.locals.userId)
    })
  )

export const install = endpoints
  .mutation({
    description: 'Install a verified addon release as the host administrator',
    input: { body: z.object({ id: addonIdSchema }) },
    output: { OK: addonJobSchema }
  })
  .callback(async ({ body, res, response }) => {
    if (!canManageAddons(res.locals.userId)) return response.forbidden()
    return response.ok(await addonShop.start(body.id))
  })

export const checkUpdates = endpoints
  .mutation({
    description: 'Refresh the signed release catalog',
    input: {},
    output: { OK: z.boolean() }
  })
  .callback(async ({ res, response }) => {
    if (!canManageAddons(res.locals.userId)) return response.forbidden()
    await addonShop.getCatalog(true)
    return response.ok(true)
  })
