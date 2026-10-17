import { z } from 'zod'

import { catalogResult, createFontCatalog } from '../catalog'
import endpoints from '../endpoints'

const readCatalog = createFontCatalog()

export const list = endpoints
  .query({
    description: 'Browse the configured Google Fonts catalog',
    input: {},
    output: { OK: catalogResult }
  })
  .callback(async ({ core, response }) => {
    const credential = await core.api.getAPIKey('gcloud').catch(() => null)
    return response.ok(await readCatalog(credential))
  })

export const get = endpoints
  .query({
    description: 'Look up a hosted font family',
    input: { query: z.object({ family: z.string().trim().min(1).max(255) }) },
    output: { OK: catalogResult }
  })
  .callback(async ({ core, query, response }) => {
    const credential = await core.api.getAPIKey('gcloud').catch(() => null)
    return response.ok(await readCatalog(credential, query.family))
  })
