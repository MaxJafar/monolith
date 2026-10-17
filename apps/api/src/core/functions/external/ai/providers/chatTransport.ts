import OpenAI from 'openai'
import { z } from 'zod'

import type { AIProvider, CompletionRequest, CompletionValue } from './index'

type ChatOptions = {
  name: string
  baseURL: string
  local?: boolean
  structured: 'none' | 'json' | 'schema'
  extra?: Record<string, unknown>
}

export function decodeCompletion<T extends z.ZodType | undefined>(
  text: string | null | undefined,
  schema?: T
): CompletionValue<T> | null {
  if (!text) return null
  if (!schema) return text as CompletionValue<T>
  let value: unknown

  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('AI response was not valid JSON')
  }

  const result = schema.safeParse(value)

  if (!result.success)
    throw new Error('AI response did not match the requested schema')

  return result.data as CompletionValue<T>
}

/** Provider differences are data; request construction and validation have one implementation. */
export function createChatProvider(options: ChatOptions): AIProvider {
  return {
    name: options.name,
    requireAPIKey: !options.local,
    async fetch<T extends z.ZodType | undefined = undefined>(
      request: CompletionRequest<T>
    ) {
      if (!options.local && !request.apiKey)
        throw new Error(`API key is required for ${options.name}`)
      if (request.structure && options.structured === 'none')
        throw new Error(`Structured output is unavailable for ${options.name}`)

      const client = new OpenAI({
        apiKey: request.apiKey || 'ollama',
        baseURL: options.baseURL,
        timeout: 120_000,
        maxRetries: 1
      })
      const messages = [...request.messages]

      let responseFormat: OpenAI.ChatCompletionCreateParamsNonStreaming['response_format']

      if (request.structure) {
        const schema = z.toJSONSchema(request.structure, { target: 'draft-7' })
        messages.unshift({
          role: 'system',
          content:
            'Return only JSON matching this schema: ' + JSON.stringify(schema)
        })
        responseFormat =
          options.structured === 'schema'
            ? {
                type: 'json_schema',
                json_schema: { name: 'response', schema, strict: true }
              }
            : { type: 'json_object' }
      }

      const completion = await client.chat.completions.create({
        ...options.extra,
        model: request.model,
        messages,
        stream: false,
        ...(responseFormat ? { response_format: responseFormat } : {})
      })

      return decodeCompletion(
        completion.choices[0]?.message.content,
        request.structure
      )
    }
  }
}
