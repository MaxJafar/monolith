import { serviceResponse } from '@functions/external/serviceRequest'
import { z } from 'zod'

import { createMonolith } from '@monolith/server-utils'

const target = z.url().refine(value => {
  const url = new URL(value)

  return (
    ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  )
}, 'An HTTP or HTTPS address without embedded credentials is required')

export default createMonolith({ moduleId: 'cors_anywhere' })
  .query({
    description: 'Read remote text or JSON through the authenticated workspace',
    input: { query: z.object({ url: target }) },
    output: { OK: z.any() }
  })
  .callback(async ({ query, response }) => {
    try {
      const remote = await serviceResponse('Remote content', query.url, {
        headers: {
          'User-Agent': 'Monolith/1.0',
          Accept: 'application/json, text/plain, text/html;q=0.9, */*;q=0.5'
        }
      })
      const mediaType = remote.contentType.split(';')[0]?.trim().toLowerCase()

      return response.ok(
        mediaType === 'application/json' || mediaType?.endsWith('+json')
          ? (JSON.parse(remote.text) as unknown)
          : remote.text
      )
    } catch {
      return response.badRequest('The remote content could not be retrieved')
    }
  })
