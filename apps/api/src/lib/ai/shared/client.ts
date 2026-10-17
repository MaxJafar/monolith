import { readFile } from 'node:fs/promises'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

export const sharedModels = () => ({
  embedding:
    process.env.SHARED_AI_EMBEDDING_MODEL || 'monolith-embeddinggemma',
  generation: process.env.SHARED_AI_GENERATION_MODEL || 'monolith-gemma',
  relevance: 'laya'
})

/** Credentials stay on the backend; browsers never receive the host token. */
export async function sharedInference<T extends z.ZodType>(
  path: '/health' | '/v1/embeddings' | '/v1/rerank' | '/v1/chat/completions',
  schema: T,
  body?: unknown
): Promise<z.infer<T>> {
  const endpoint = process.env.SHARED_AI_URL
  const keyPath = process.env.SHARED_AI_TOKEN_FILE

  if (!endpoint || !keyPath)
    throw new ClientError('Shared Mac mini AI is not configured', 503)

  const url = new URL(endpoint)

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol === 'http:' &&
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  )
    throw new ClientError(
      'Use an HTTPS AI endpoint or a loopback SSH tunnel',
      503
    )

  try {
    const token = (await readFile(keyPath, 'utf8')).trim()

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token))
      throw new Error('Invalid credential')

    const response = await fetch(new URL(path, url), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(180_000)
    })

    if (!response.ok) {
      await response.body?.cancel()
      throw new ClientError(
        response.status === 429
          ? 'Mac mini AI is busy; try again shortly'
          : 'Mac mini AI is unavailable',
        503
      )
    }

    const reader = response.body?.getReader()

    if (!reader) throw new Error('Missing response')

    const parts: Uint8Array[] = []
    let bytes = 0

    while (true) {
      const part = await reader.read()

      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > 4 * 1024 * 1024) {
        await reader.cancel()
        throw new Error('Response size exceeded')
      }
      parts.push(part.value)
    }

    return schema.parse(JSON.parse(Buffer.concat(parts).toString('utf8')))
  } catch (error) {
    if (error instanceof ClientError) throw error

    throw new ClientError('Mac mini AI connection or response failed', 503)
  }
}
