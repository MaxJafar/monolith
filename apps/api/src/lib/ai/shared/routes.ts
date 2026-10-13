import z from 'zod'

import { createForge } from '@lifeforge/server-utils'

import { sharedInference, sharedModels } from './client'

const forge = createForge({ moduleId: 'ai' })
const probability = z.number().finite().min(0).max(1)
const scoreReply = z.object({
  model: z.literal('laya'),
  scores: z.array(
    z.object({
      id: z.number().int(),
      relevance: probability,
      confidence: probability,
      truncated: z.boolean(),
      model: z.string()
    })
  )
})
const chatReply = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string(),
        message: z.object({ role: z.string(), content: z.string() })
      })
    )
    .length(1)
})

export const status = forge
  .query({
    description: 'Check the shared Mac mini inference host',
    output: {
      OK: z.object({
        ready: z.boolean(),
        laya: z.boolean(),
        host: z.literal('mac-mini'),
        models: z.array(z.string())
      })
    }
  })
  .callback(async ({ response }) =>
    response.ok(
      await sharedInference(
        '/health',
        z.object({
          ready: z.boolean(),
          laya: z.boolean(),
          host: z.literal('mac-mini'),
          models: z.array(z.string())
        })
      )
    )
  )

export const embed = forge
  .mutation({
    description: 'Embed bounded text on the shared Mac mini',
    input: {
      body: z.object({
        texts: z.array(z.string().min(1).max(7600)).min(1).max(16),
        purpose: z.enum(['query', 'document']).default('document')
      })
    },
    output: {
      OK: z.object({
        model: z.string(),
        vectors: z.array(z.array(z.number().finite()).length(768))
      })
    }
  })
  .callback(async ({ body, response }) => {
    const model = sharedModels().embedding
    const result = await sharedInference(
      '/v1/embeddings',
      z.object({
        data: z.array(
          z.object({
            index: z.number().int(),
            embedding: z.array(z.number().finite()).length(768)
          })
        )
      }),
      {
        model,
        input: body.texts.map(text =>
          body.purpose === 'query'
            ? `task: search result | query: ${text}`
            : `title: none | text: ${text}`
        )
      }
    )
    const vectors = body.texts.map((_, index) => {
      const matches = result.data.filter(item => item.index === index)

      if (matches.length !== 1) throw new Error('Invalid embedding indexes')

      return matches[0]!.embedding
    })

    return response.ok({ model, vectors })
  })

export const rerank = forge
  .mutation({
    description: 'Score retrieved evidence using Mac mini Laya',
    input: {
      body: z.object({
        query: z.string().trim().min(1).max(800),
        items: z
          .array(
            z.object({
              id: z.number().int(),
              passage: z.string().min(1).max(1400)
            })
          )
          .min(1)
          .max(12)
          .refine(
            items => new Set(items.map(item => item.id)).size === items.length,
            'IDs must be unique'
          )
      })
    },
    output: { OK: scoreReply }
  })
  .callback(async ({ body, response }) => {
    const result = await sharedInference('/v1/rerank', scoreReply, body)

    if (
      result.scores.length !== body.items.length ||
      new Set(result.scores.map(s => s.id)).size !== body.items.length ||
      result.scores.some(
        score => !body.items.some(item => item.id === score.id)
      )
    )
      throw new Error('Invalid relevance IDs')

    return response.ok(result)
  })

export const generate = forge
  .mutation({
    description: 'Run text or image understanding on the shared Mac mini',
    input: {
      body: z.object({
        prompt: z.string().trim().min(1).max(12000),
        image: z
          .string()
          .max(11_000_000)
          .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/)
          .optional()
      })
    },
    output: { OK: z.object({ model: z.string(), text: z.string() }) }
  })
  .callback(async ({ body, response }) => {
    const model = sharedModels().generation
    const result = await sharedInference('/v1/chat/completions', chatReply, {
      model,
      stream: false,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: body.image
            ? [
                { type: 'text', text: body.prompt },
                { type: 'image_url', image_url: { url: body.image } }
              ]
            : body.prompt
        }
      ]
    })

    if (result.choices[0]!.finish_reason !== 'stop')
      throw new Error('Model output was incomplete')

    return response.ok({ model, text: result.choices[0]!.message.content })
  })
