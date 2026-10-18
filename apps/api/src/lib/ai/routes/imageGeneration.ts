import OpenAI from 'openai'
import { z } from 'zod'

import { createMonolith } from '@monolith/server-utils'

const api = createMonolith({ moduleId: 'ai' })

export const generateImage = api
  .mutation({
    description: 'Render an image from a text description',
    input: { body: z.object({ prompt: z.string().trim().min(1).max(32_000) }) },
    output: { OK: z.string() }
  })
  .callback(async ({ core, body, response }) => {
    const apiKey = await core.api.getAPIKey('openai')

    if (!apiKey) return response.badRequest('Configure an OpenAI API key first')

    const client = new OpenAI({ apiKey, timeout: 180_000, maxRetries: 0 })
    const result = await client.images.generate({
      model: 'gpt-image-1',
      size: '1536x1024',
      prompt: body.prompt
    })
    const image = result.data?.find(item => item.b64_json)?.b64_json

    return image
      ? response.ok('data:image/png;base64,' + image)
      : response.badRequest('The image service returned no image')
  })
