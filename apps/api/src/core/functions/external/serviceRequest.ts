import type { ZodType, output } from 'zod'

export class ExternalServiceError extends Error {
  constructor(
    readonly service: string,
    readonly status?: number
  ) {
    super(
      status
        ? service + ' returned HTTP ' + status
        : service + ' returned an invalid response'
    )
    this.name = 'ExternalServiceError'
  }
}

/** Bounded service responses never include request credentials or remote bodies in errors. */
export async function serviceResponse(
  service: string,
  url: URL | string,
  init: RequestInit = {},
  limit = 8 * 1024 * 1024
): Promise<{ text: string; contentType: string }> {
  const timeout = AbortSignal.timeout(20_000)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  const response = await fetch(url, { ...init, signal }).catch(() => {
    throw new ExternalServiceError(service)
  })

  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    throw new ExternalServiceError(service, response.status)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const reader = response.body?.getReader()

  if (!reader) return { text: '', contentType }

  const chunks: Uint8Array[] = []

  let bytes = 0

  try {
    for (;;) {
      const part = await reader.read()

      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > limit) throw new ExternalServiceError(service)
      chunks.push(part.value)
    }

    return { text: Buffer.concat(chunks).toString('utf8'), contentType }
  } catch (error) {
    await reader.cancel().catch(() => {})
    if (error instanceof ExternalServiceError) throw error
    throw new ExternalServiceError(service)
  } finally {
    reader.releaseLock()
  }
}

export async function serviceJSON<T extends ZodType>(
  service: string,
  url: URL | string,
  schema: T,
  init: RequestInit = {},
  limit = 8 * 1024 * 1024
): Promise<output<T>> {
  const response = await serviceResponse(service, url, init, limit)

  try {
    const parsed = schema.safeParse(JSON.parse(response.text) as unknown)

    if (parsed.success) return parsed.data
  } catch {
    /* Invalid service data is never copied into a client-facing error. */
  }
  throw new ExternalServiceError(service)
}
