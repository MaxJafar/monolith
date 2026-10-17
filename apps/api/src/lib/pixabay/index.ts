import { serviceJSON } from '@functions/external/serviceRequest'
import { z } from 'zod'

import { createMonolith, defineRoutes } from '@monolith/server-utils'

const search = z.object({
  q: z.string().trim().min(1).max(200),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .max(6)
    .default('1'),
  type: z.enum(['all', 'photo', 'illustration', 'vector']).default('all'),
  category: z
    .enum([
      'backgrounds',
      'fashion',
      'nature',
      'science',
      'education',
      'feelings',
      'health',
      'people',
      'religion',
      'places',
      'animals',
      'industry',
      'computer',
      'food',
      'sports',
      'transportation',
      'travel',
      'buildings',
      'business',
      'music'
    ])
    .optional(),
  colors: z
    .enum([
      'grayscale',
      'transparent',
      'red',
      'orange',
      'yellow',
      'green',
      'turquoise',
      'blue',
      'lilac',
      'pink',
      'white',
      'gray',
      'black',
      'brown'
    ])
    .nullable()
    .optional(),
  editors_choice: z.enum(['true', 'false']).default('false')
})
const providerResult = z.object({
  totalHits: z.number().int().nonnegative(),
  hits: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      webformatURL: z.url(),
      webformatWidth: z.number().nonnegative(),
      webformatHeight: z.number().nonnegative(),
      largeImageURL: z.url()
    })
  )
})
const searchImages = createMonolith({ moduleId: 'pixabay' })
  .query({
    description: 'Search the configured image catalog',
    input: { query: search },
    output: {
      OK: z.object({
        total: z.number(),
        hits: z.array(
          z.object({
            id: z.string(),
            imageURL: z.string(),
            thumbnail: z.object({
              url: z.string(),
              width: z.number(),
              height: z.number()
            })
          })
        )
      })
    }
  })
  .callback(async ({ query, core, response }) => {
    const key = await core.api.getAPIKey('pixabay').catch(() => null)
    if (!key) return response.badRequest('Pixabay API key is not set')
    const url = new URL('https://pixabay.com/api/')
    for (const [name, value] of Object.entries({
      ...query,
      key,
      q: query.q,
      image_type: query.type
    })) {
      if (value != null && name !== 'type') url.searchParams.set(name, value)
    }
    try {
      const result = await serviceJSON('Image catalog', url, providerResult)
      return response.ok({
        total: result.totalHits,
        hits: result.hits.map(image => ({
          id: String(image.id),
          imageURL: image.largeImageURL,
          thumbnail: {
            url: image.webformatURL,
            width: image.webformatWidth,
            height: image.webformatHeight
          }
        }))
      })
    } catch {
      return response.badRequest('The image catalog could not be retrieved')
    }
  })

export default defineRoutes({ searchImages })
