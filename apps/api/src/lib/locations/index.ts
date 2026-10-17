import { z } from 'zod'

import {
  LocationSchema,
  createMonolith,
  defineRoutes
} from '@monolith/server-utils'

import searchLocations from '../../core/functions/external/location'

const api = createMonolith({ moduleId: 'locations' })
export default defineRoutes({
  search: api
    .query({
      description: 'Find places by name or address',
      input: { query: z.object({ q: z.string().trim().min(1).max(1000) }) },
      output: { OK: z.array(LocationSchema) }
    })
    .callback(async ({ core, query, response }) => {
      const credential = await core.api.getAPIKey('gcloud')
      if (!credential)
        return response.badRequest(
          'Configure a Google Places API key to search'
        )
      return response.ok(await searchLocations(credential, query.q))
    })
})
