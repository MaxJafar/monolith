import axios, { type AxiosAdapter, AxiosError, type AxiosResponse } from 'axios'

import { getNativeRuntime } from './runtime'

export const nativeAxiosAdapter: AxiosAdapter = async config => {
  const runtime = getNativeRuntime()
  if (!runtime) throw new Error('No desktop connection is active')
  // Only the path of a first-party Monolith request is accepted. Native code
  // independently enforces the active origin and supplies authentication.
  const uri = axios.getUri({
    ...config,
    baseURL: runtime.profile.origin + '/api'
  })
  const url = new URL(uri, runtime.profile.origin)
  if (url.origin !== runtime.profile.origin)
    throw new Error('Request origin is not permitted')
  const headers = Object.fromEntries(
    Object.entries(config.headers.toJSON()).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' &&
        !['authorization', 'cookie', 'host', 'origin'].includes(
          entry[0].toLowerCase()
        )
    )
  )
  let body = config.data as string | undefined
  let bodyEncoding: 'base64' | undefined
  if (
    config.data instanceof FormData ||
    config.data instanceof Blob ||
    config.data instanceof ArrayBuffer
  ) {
    const request = new Request(runtime.profile.origin, {
      method: 'POST',
      body: config.data
    })
    const bytes = new Uint8Array(await request.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    body = btoa(binary)
    bodyEncoding = 'base64'
    if (request.headers.get('content-type'))
      headers['Content-Type'] = request.headers.get('content-type')!
  }
  const result = await runtime.transport.request({
    path: url.pathname + url.search,
    method: config.method?.toUpperCase(),
    headers,
    body,
    bodyEncoding,
    signal: config.signal as AbortSignal | undefined
  })
  const bytes =
    result.encoding === 'base64'
      ? Uint8Array.from(atob(result.body), char => char.charCodeAt(0))
      : new TextEncoder().encode(result.body)
  const data =
    config.responseType === 'arraybuffer'
      ? bytes.buffer
      : config.responseType === 'blob'
        ? new Blob([bytes], { type: result.headers['content-type'] })
        : new TextDecoder().decode(bytes)
  const response: AxiosResponse = {
    data,
    status: result.status,
    statusText: '',
    headers: result.headers,
    config
  }
  if (config.validateStatus && !config.validateStatus(result.status))
    throw new AxiosError(
      'The request failed',
      String(result.status),
      config,
      undefined,
      response
    )
  return response
}
