import type OpenAI from 'openai'
import type { ZodType, output } from 'zod'

export type CompletionValue<T> = T extends ZodType ? output<T> : string
export interface CompletionRequest<T extends ZodType | undefined = undefined> {
  model: string
  messages: OpenAI.ChatCompletionMessageParam[]
  apiKey?: string
  structure?: T
}
export interface AIProvider {
  name: string
  requireAPIKey: boolean
  fetch<T extends ZodType | undefined = undefined>(
    request: CompletionRequest<T>
  ): Promise<CompletionValue<T> | null>
}

const providers = new Map<string, AIProvider>()

export function registerProvider(name: string, provider: AIProvider) {
  if (
    !/^[a-z][a-z0-9-]*$/.test(name) ||
    name !== provider.name ||
    typeof provider.fetch !== 'function'
  )
    throw new TypeError('Invalid AI provider registration')
  providers.set(name, Object.freeze({ ...provider }))
}

export function getProvider(name: string) {
  return providers.get(name)
}
