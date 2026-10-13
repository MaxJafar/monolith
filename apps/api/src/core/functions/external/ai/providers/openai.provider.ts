import { createServiceLogger } from '@functions/logging'
import { zodTextFormat } from '@functions/utils/zodResponseFormat'
import chalk from 'chalk'
import OpenAI from 'openai'
import z from 'zod'

import { AIProvider } from './index'

const logger = createServiceLogger('AI')

/** Translate the shared Chat message contract to the Responses input contract. */
export function toResponsesInput(
  messages: OpenAI.ChatCompletionMessageParam[]
): OpenAI.Responses.ResponseInput {
  return messages.map(message => {
    if (
      message.role === 'tool' ||
      message.role === 'function' ||
      (message.role === 'assistant' &&
        (message.tool_calls?.length || message.function_call))
    ) {
      throw new Error(
        'Tool messages are not supported by this text/image provider'
      )
    }

    const content =
      typeof message.content === 'string'
        ? message.content
        : (message.content ?? []).map(part => {
            if (part.type === 'text')
              return { type: 'input_text' as const, text: part.text }
            if (part.type === 'image_url')
              return {
                type: 'input_image' as const,
                image_url: part.image_url.url,
                detail: part.image_url.detail ?? ('auto' as const)
              }
            throw new Error(`Unsupported message content: ${part.type}`)
          })

    return { role: message.role, content }
  })
}

async function fetchOpenAI<
  T extends z.ZodTypeAny | undefined = undefined
>(params: {
  model: string
  messages: OpenAI.ChatCompletionMessageParam[]
  apiKey?: string
  structure?: T
}): Promise<(T extends z.ZodTypeAny ? z.infer<T> : string) | null> {
  const { model, messages, apiKey, structure } = params

  if (!apiKey) {
    throw new Error('API key is required for OpenAI provider')
  }

  const client = new OpenAI({ apiKey })

  if (structure) {
    const completion = await client.responses.parse({
      model,
      input: toResponsesInput(messages),
      text: {
        format: zodTextFormat(structure, 'response')
      }
    })

    const parsedResponse = completion.output_parsed

    if (!parsedResponse) {
      logger.error('No structured response received from OpenAI model.')

      return null
    }

    logger.debug(
      `Received structured response (${chalk.blue(Object.keys(parsedResponse).length)} fields) from OpenAI model: ${chalk.green(model)}`
    )

    return parsedResponse as T extends z.ZodTypeAny ? z.infer<T> : string
  }

  const response = await client.responses.create({
    input: toResponsesInput(messages),
    model
  })

  const res = response.output_text

  if (!res) {
    logger.error('No text response received from OpenAI model.')

    return null
  }

  logger.debug(
    `Received text response (${chalk.blue(res.length)} characters) from OpenAI model: ${chalk.green(model)}`
  )

  return res as T extends z.ZodTypeAny ? z.infer<T> : string
}

export const openaiProvider: AIProvider = {
  name: 'openai',
  requireAPIKey: true,
  fetch: fetchOpenAI
}
