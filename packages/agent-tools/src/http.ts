import { MonolithError } from './types.js'

export const MAX_BYTES = 8 * 1024 * 1024

export function serverOrigin(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new MonolithError('Use an absolute Monolith server URL.')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new MonolithError(
      'Use an HTTPS server origin, without a path, credentials or query. HTTP is allowed only on loopback.'
    )
  return url.origin
}

export async function readBounded(
  stream: AsyncIterable<Uint8Array | string>,
  limit = MAX_BYTES
): Promise<string> {
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk)
    length += bytes.length
    if (length > limit)
      throw new MonolithError(
        'Input or response exceeds the size limit.',
        'too_large'
      )
    chunks.push(bytes)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Never follow redirects with account credentials or retry a mutation whose
 * outcome is unknown. HTTPS uses the system's normal certificate validation. */
export async function request(
  server: string,
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string
    signal?: AbortSignal
  } = {}
): Promise<unknown> {
  const origin = serverOrigin(server)
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
    throw new MonolithError('Invalid API path.')
  const url = new URL(path, origin)
  if (url.origin !== origin) throw new MonolithError('API origin mismatch.')
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body)
  if (body && Buffer.byteLength(body) > MAX_BYTES)
    throw new MonolithError('Request is too large.', 'too_large')
  let response: Response
  let text: string
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      redirect: 'error',
      signal: AbortSignal.any([
        AbortSignal.timeout(30_000),
        ...(options.signal ? [options.signal] : [])
      ]),
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
      },
      body
    })
    text = response.body
      ? await readBounded(response.body as unknown as AsyncIterable<Uint8Array>)
      : ''
  } catch (error) {
    if (error instanceof MonolithError) throw error
    throw new MonolithError(
      'Monolith request failed or timed out. No automatic retry was made; check the result before repeating a write.',
      'connection_failed'
    )
  }
  let value: any = null
  if (text) {
    try {
      value = JSON.parse(text)
    } catch {
      throw new MonolithError(
        'Server returned a non-JSON response. Check the gateway URL.',
        'invalid_response',
        response.status
      )
    }
  }
  if (!response.ok || value?.state === 'error') {
    const message =
      response.status >= 500
        ? 'Monolith server error.'
        : response.status === 401
          ? 'Session expired or revoked. Run auth logout, then auth login to sign in again.'
          : typeof value?.message === 'string'
            ? value.message.slice(0, 1000)
            : `Monolith returned HTTP ${response.status}.`
    throw new MonolithError(
      message,
      typeof value?.code === 'string' ? value.code : 'api_error',
      response.status,
      response.status === 409 ? value?.current : undefined
    )
  }
  return value?.state === 'success' ? (value.data ?? null) : value
}
