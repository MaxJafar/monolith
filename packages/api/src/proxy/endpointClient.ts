import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { AxiosResponse } from 'axios'
import { z } from 'zod'

import {
  APIError,
  type FetchAPIOptions,
  type ResponseWrapper,
  fetchAPI
} from '../client/fetch'
import {
  createEncryptionSession,
  decryptResponse,
  encryptRequest,
  initializeEncryption,
  isEncryptedResponse
} from '../crypto/encryption'
import type { InferRawInput, InferRawOutput } from '../types/socket'
import { globalProxyRegistry } from './registry'
import { getFormData, hasFile, joinObjectsRecursively } from './utils'

type TransportOptions = Omit<FetchAPIOptions, 'method' | 'body'> & {
  raw?: boolean
}
type QueryOptions = Omit<UseQueryOptions<any>, 'queryFn' | 'queryKey'> & {
  queryKey?: unknown[]
}
type MutationOptions<T> = Omit<
  UseMutationOptions<InferRawOutput<T>, any, InferRawInput<T>['body']>,
  'mutationKey' | 'mutationFn'
>
type RawResult<T> = AxiosResponse<ResponseWrapper<InferRawOutput<T>>>

export class EndpointClient<T extends { __isEndpointContract: true } = any> {
  declare public __type: T
  protected _input: Record<string, any> | undefined

  constructor(
    private _apiHost = '',
    private _route: string,
    private _contract?: any,
    private _rootContract?: any
  ) {}

  private get connection() {
    const registered = this._rootContract
      ? globalProxyRegistry.get(this._rootContract)
      : undefined
    return {
      host:
        registered?.apiHost ??
        (this._apiHost ||
          (typeof location === 'undefined' ? '' : location.origin)),
      prefix: registered?.remoteId ? 'modules/' + registered.remoteId : ''
    }
  }

  get schema() {
    const input = this._contract?.input
    return {
      query: input?.query ? z.fromJSONSchema(input.query) : undefined,
      body: input?.body ? z.fromJSONSchema(input.body) : undefined
    }
  }

  get key() {
    const parts: unknown[] = [
      ...this.connection.prefix.split('/'),
      ...this._route.split('/')
    ].filter(Boolean)
    if (this._input) parts.push(this._input)
    return parts
  }

  get endpoint() {
    const { host, prefix } = this.connection
    const base = host.startsWith('/')
      ? (typeof location === 'undefined' ? '' : location.origin) + host
      : host
    return new URL(
      this._getPath(prefix).replace(/^\//, ''),
      base.replace(/\/$/, '') + '/'
    ).toString()
  }

  setHost(host: string) {
    this._apiHost = host
    return this
  }
  input(data: InferRawInput<T>['query']) {
    this._input = joinObjectsRecursively(
      joinObjectsRecursively({}, this._input ?? {}),
      data as Record<string, any>
    )
    return this
  }

  queryOptions(options: QueryOptions = {}): UseQueryOptions<InferRawOutput<T>> {
    return {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      ...options,
      queryKey: options.queryKey ?? this.key,
      queryFn: () => this.query()
    }
  }
  rawQueryOptions(
    options: QueryOptions = {}
  ): UseQueryOptions<InferRawOutput<T>> {
    return {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      ...options,
      queryKey: [...(options.queryKey ?? this.key), 'raw'],
      queryFn: () => this.queryRaw()
    }
  }
  mutationOptions(
    options: MutationOptions<T> = {}
  ): UseMutationOptions<InferRawOutput<T>, any, InferRawInput<T>['body']> {
    return {
      retry: false,
      ...options,
      mutationKey: this.key,
      mutationFn: data => this.mutate(data)
    }
  }
  rawMutationOptions(
    options: MutationOptions<T> = {}
  ): UseMutationOptions<InferRawOutput<T>, any, InferRawInput<T>['body']> {
    return {
      retry: false,
      ...options,
      mutationKey: [...this.key, 'raw'],
      mutationFn: data => this.mutateRaw(data)
    }
  }

  private async encrypted(
    method: 'GET' | 'POST',
    body?: unknown
  ): Promise<InferRawOutput<T>> {
    const { host, prefix } = this.connection
    const path = this._getPath(prefix)
    const send = async () => {
      if (method === 'GET') {
        const { encryptedKey, session } = await createEncryptionSession(host)
        const result = await fetchAPI<any>(host, path, {
          method,
          headers: { 'X-Monolith-Key': encryptedKey }
        })
        return isEncryptedResponse(result)
          ? decryptResponse<InferRawOutput<T>>(result, session)
          : result
      }
      const { payload, session } = await encryptRequest(body ?? {}, host)
      const result = await fetchAPI<any>(host, path, { method, body: payload })
      return isEncryptedResponse(result)
        ? decryptResponse<InferRawOutput<T>>(result, session)
        : result
    }
    try {
      return await send()
    } catch (error) {
      // These errors occur before the server invokes a route, so one key refresh is safe.
      if (
        !(error instanceof APIError) ||
        error.status !== 400 ||
        ![
          'Failed to decrypt payload',
          'Failed to decrypt encryption key'
        ].includes(error.message)
      )
        throw error
      await initializeEncryption(host)
      return send()
    }
  }

  query(): Promise<InferRawOutput<T>> {
    return this.encrypted('GET')
  }
  mutate(data: InferRawInput<T>['body']): Promise<InferRawOutput<T>> {
    return (data as unknown) instanceof FormData || hasFile(data)
      ? this.mutateRaw(data)
      : this.encrypted('POST', data)
  }

  private raw(
    method: 'GET' | 'POST',
    body: any,
    options: TransportOptions
  ): Promise<InferRawOutput<T> | RawResult<T>> {
    const { host, prefix } = this.connection
    const { raw, ...rest } = options
    const settings = {
      ...rest,
      method,
      ...(method === 'POST'
        ? {
            body:
              body instanceof FormData
                ? body
                : hasFile(body)
                  ? getFormData(body)
                  : (body ?? {})
          }
        : {})
    }
    return raw
      ? fetchAPI<InferRawOutput<T>>(host, this._getPath(prefix), {
          ...settings,
          raw: true
        })
      : fetchAPI<InferRawOutput<T>>(host, this._getPath(prefix), settings)
  }

  queryRaw(options: TransportOptions & { raw: true }): Promise<RawResult<T>>
  queryRaw(
    options?: TransportOptions & { raw?: false }
  ): Promise<InferRawOutput<T>>
  queryRaw(
    options: TransportOptions = {}
  ): Promise<InferRawOutput<T> | RawResult<T>> {
    return this.raw('GET', undefined, options)
  }

  mutateRaw(
    data: InferRawInput<T>['body'] | FormData,
    options: TransportOptions & { raw: true }
  ): Promise<RawResult<T>>
  mutateRaw(
    data: InferRawInput<T>['body'] | FormData,
    options?: TransportOptions & { raw?: false }
  ): Promise<InferRawOutput<T>>
  mutateRaw(
    data: InferRawInput<T>['body'] | FormData,
    options: TransportOptions = {}
  ): Promise<InferRawOutput<T> | RawResult<T>> {
    return this.raw('POST', data, options)
  }

  protected _getPath(prefix = ''): string {
    const route = [prefix, this._route].filter(Boolean).join('/')
    const entries = Object.entries(this._input ?? {}).filter(
      ([, value]) => value !== undefined
    )
    const query = entries
      .map(
        ([name, value]) =>
          encodeURIComponent(name) + '=' + encodeURIComponent(String(value))
      )
      .join('&')
    return route + (query ? '?' + query : '')
  }
}
