import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { ZodType } from 'zod'

import type { AIProvider, CompletionRequest, CompletionValue } from './index'

/** The SDK contract supports text and images; tool execution belongs to the agent runtime. */
export function toResponsesInput(
  messages: OpenAI.ChatCompletionMessageParam[]
): OpenAI.Responses.ResponseInput {
  const input: OpenAI.Responses.ResponseInput = []

  for (const message of messages) {
    if (
      message.role === 'tool' ||
      message.role === 'function' ||
      (message.role === 'assistant' &&
        (message.tool_calls?.length || message.function_call))
    )
      throw new Error(
        'Tool messages are not supported by this text/image provider'
      )

    if (typeof message.content === 'string') {
      input.push({ role: message.role, content: message.content })
      continue
    }

    const content: OpenAI.Responses.ResponseInputContent[] = []

    for (const part of message.content ?? []) {
      switch (part.type) {
        case 'text':
          content.push({ type: 'input_text', text: part.text })
          break
        case 'image_url':
          content.push({
            type: 'input_image',
            image_url: part.image_url.url,
            detail: part.image_url.detail ?? 'auto'
          })
          break
        default:
          throw new Error('Unsupported message content: ' + part.type)
      }
    }
    input.push({ role: message.role, content })
  }

  return input
}

export const openaiProvider: AIProvider = {
  name: 'openai',
  requireAPIKey: true,
  async fetch<T extends ZodType | undefined = undefined>(
    request: CompletionRequest<T>
  ): Promise<CompletionValue<T> | null> {
    if (!request.apiKey)
      throw new Error('API key is required for OpenAI provider')

    const client = new OpenAI({
      apiKey: request.apiKey,
      timeout: 120_000,
      maxRetries: 1
    })
    const input = toResponsesInput(request.messages)

    if (request.structure) {
      const result = await client.responses.parse({
        model: request.model,
        input,
        text: { format: zodTextFormat(request.structure, 'response') }
      })

      return (result.output_parsed ?? null) as CompletionValue<T> | null
    }

    const result = await client.responses.create({
      model: request.model,
      input
    })

    return (result.output_text || null) as CompletionValue<T> | null
  }
}
