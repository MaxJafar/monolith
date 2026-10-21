// SPDX-License-Identifier: 0BSD
import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse
} from 'axios'

import { createAxiosInstance } from './axios'
import {
  APIError,
  copyHeaders,
  decodeBody,
  responseMessage,
  unpackResponse
} from './response'

export { APIError } from './response'
export type ResponseWrapper<T> =
  { state: 'success'; data: T } | { state: 'error'; message: string }
export type FetchAPIOptions = Omit<
  AxiosRequestConfig,
  'method' | 'url' | 'data'
> & {
  method?: string
  body?: string | FormData | URLSearchParams | Blob | Record<string, unknown>
  raiseError?: boolean
  isExternal?: boolean
}

function contentType(value: FetchAPIOptions['body']): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof FormData !== 'undefined' && value instanceof FormData)
    return 'multipart/form-data'
  if (value instanceof URLSearchParams)
    return 'application/x-www-form-urlencoded'
  if (typeof Blob !== 'undefined' && value instanceof Blob)
    return 'application/octet-stream'
  return 'application/json'
}

function requestSettings(
  endpoint: string,
  options: FetchAPIOptions & { raw?: boolean }
): AxiosRequestConfig {
  const {
    raw: _raw,
    body,
    raiseError: _raiseError,
    isExternal,
    method = 'GET',
    ...settings
  } = options
  const headers = copyHeaders(settings.headers)
  const mime = contentType(body)
  if (mime) headers.setContentType(mime)
  const route =
    endpoint.startsWith('/') || /^https?:\/\//i.test(endpoint)
      ? endpoint
      : '/' + endpoint
  return {
    ...settings,
    method: method.toUpperCase(),
    url: isExternal ? endpoint : route.replaceAll('$', '__'),
    headers,
    timeout: settings.timeout ?? 300_000,
    data: body,
    withCredentials: true,
    ...(!isExternal
      ? {
          responseType: 'arraybuffer',
          transformResponse: [
            (data: unknown, responseHeaders: any) =>
              AxiosHeaders.from(responseHeaders).get(
                'x-monolith-downloadable'
              ) === 'true'
                ? data
                : decodeBody(data)
          ]
        }
      : {})
  }
}

function requestError(error: unknown): Error {
  if (axios.isCancel(error)) return error
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return new Error('Request timeout', { cause: error })
    if (error.response)
      return new APIError(
        responseMessage(error.response.data, 'Failed to perform API request'),
        error.response.status
      )
    if (error.request)
      return new Error('Network error: No response received', { cause: error })
  }
  return error instanceof Error
    ? error
    : new Error('Failed to perform API request', { cause: error })
}

export function fetchAPI<T>(
  apiHost: string,
  endpoint: string,
  options: FetchAPIOptions & { raw: true }
): Promise<AxiosResponse<ResponseWrapper<T>>>
export function fetchAPI<T>(
  apiHost: string,
  endpoint: string,
  options?: FetchAPIOptions & { raw?: false }
): Promise<T>
export async function fetchAPI<T>(
  apiHost: string,
  endpoint: string,
  options: FetchAPIOptions & { raw?: boolean } = {}
): Promise<T | AxiosResponse> {
  try {
    const client = createAxiosInstance(apiHost, options.isExternal ?? false)
    const response = await client.request(requestSettings(endpoint, options))
    return options.raw
      ? response
      : unpackResponse<T>(response, options.isExternal ?? false)
  } catch (error) {
    if (options.raiseError === false) return undefined as T
    throw requestError(error)
  }
}
