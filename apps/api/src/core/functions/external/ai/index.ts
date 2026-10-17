import type { ZodType } from 'zod'

import { ClientError, type FetchAIFunc } from '@monolith/server-utils'

import type { db } from '../../../drizzle'
import getAPIKeyFactory, {
  validateCallerAccess
} from '../../database/getAPIKey'
import {
  type CompletionRequest,
  getProvider,
  registerProvider
} from './providers'
import { deepseekProvider } from './providers/deepseek.provider'
import { groqProvider } from './providers/groq.provider'
import { ollamaProvider } from './providers/ollama.provider'
import { openaiProvider } from './providers/openai.provider'
import { openrouterProvider } from './providers/openrouter.provider'

for (const provider of [
  openaiProvider,
  groqProvider,
  ollamaProvider,
  deepseekProvider,
  openrouterProvider
])
  registerProvider(provider.name, provider)

type Caller = { source: 'app' | 'core'; id: string }

export default function createFetchAI(
  database: typeof db,
  caller: Caller | undefined
): FetchAIFunc {
  return async <T extends ZodType | undefined = undefined>(
    request: Omit<CompletionRequest<T>, 'apiKey'> & { provider: string }
  ) => {
    if (!caller)
      throw new Error('A caller identity is required to access AI providers')

    const provider = getProvider(request.provider)

    if (!provider)
      throw new ClientError('Unknown AI provider: ' + request.provider)
    let apiKey: string | undefined

    if (provider.requireAPIKey) {
      await validateCallerAccess(caller, provider.name)
      apiKey = await getAPIKeyFactory(database, caller)(provider.name)
      if (!apiKey)
        throw new ClientError('Missing credential for ' + provider.name)
    }

    return provider.fetch({ ...request, apiKey })
  }
}

export { getProvider, registerProvider } from './providers'
