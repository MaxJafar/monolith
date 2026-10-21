// SPDX-License-Identifier: 0BSD
import { AxiosHeaders, type AxiosResponse } from 'axios'

export function copyHeaders(input?: object): AxiosHeaders {
  return new AxiosHeaders(
    Object.fromEntries(
      Object.entries(input ?? {}).filter(([, value]) => value !== undefined)
    )
  )
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function decodeBody(body: unknown): unknown {
  let value = body
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    const bytes =
      body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    value = new TextDecoder().decode(bytes)
  }
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function responseMessage(body: unknown, fallback: string): string {
  const decoded = decodeBody(body)
  if (
    decoded &&
    typeof decoded === 'object' &&
    'message' in decoded &&
    typeof decoded.message === 'string' &&
    decoded.message.trim()
  )
    return decoded.message
  return fallback
}

export function unpackResponse<T>(
  response: AxiosResponse,
  external: boolean
): T {
  const { status, data } = response
  if (status < 200 || status >= 400) {
    throw new APIError(
      responseMessage(data, 'Failed to perform API request'),
      status
    )
  }
  if (status === 204) return undefined as T
  if (external) return data as T

  const headers = copyHeaders(response.headers)
  if (headers.get('x-monolith-downloadable') === 'true') {
    if (data instanceof ArrayBuffer) return new Uint8Array(data) as T
    if (ArrayBuffer.isView(data))
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as T
    throw new APIError('Invalid file response', status)
  }
  const mime = String(headers.get('content-type') ?? '').toLowerCase()
  if (mime.includes('text/plain')) return data as T
  if (mime.includes('application/json')) {
    const envelope = decodeBody(data)
    if (envelope && typeof envelope === 'object' && 'state' in envelope) {
      if (envelope.state === 'error')
        throw new APIError(
          responseMessage(envelope, 'API returned an error'),
          status
        )
      if (envelope.state === 'success')
        return ('data' in envelope ? envelope.data : undefined) as T
    }
  }
  throw new APIError('Unexpected API response format', status)
}
