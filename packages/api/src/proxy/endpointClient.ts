// SPDX-License-Identifier: 0BSD
import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { AxiosResponse } from 'axios'
import { z } from 'zod'

import {
  type FetchAPIOptions,
  type ResponseWrapper,
  fetchAPI
} from '../client/fetch'
import type { InferRawInput, InferRawOutput } from '../types/socket'
import { encryptedRequest } from './encryptedRequest'
import { globalProxyRegistry } from './registry'
import { getFormData, hasFile, joinObjectsRecursively } from './utils'

type TransportOptions = Omit<FetchAPIOptions, 'body' | 'method'> & {
  raw?: boolean
}
type QueryOptions = Omit<UseQueryOptions<any>, 'queryFn' | 'queryKey'> & {
  queryKey?: unknown[]
}
type MutationOptions<T> = Omit<
  UseMutationOptions<InferRawOutput<T>, any, InferRawInput<T>['body']>,
  'mutationFn' | 'mutationKey'
>
type RawResult<T> = AxiosResponse<ResponseWrapper<InferRawOutput<T>>>
const browserOrigin = () =>
  typeof location === 'undefined' ? '' : location.origin
const isForm = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData

export class EndpointClient<T extends { __isEndpointContract: true } = any> {
  declare __type: T
  protected _input: Record<string, any> | undefined
  private host: string
  constructor(
    apiHost: string = '',
    private route: string,
    private contract?: any,
    private root?: object
  ) {
    this.host = apiHost
  }
  private get target() {
    const registered = this.root && globalProxyRegistry.get(this.root)
    const host = registered ? registered.apiHost : this.host || browserOrigin()
    const prefix = registered?.remoteId
      ? ['modules', registered.remoteId].join('/')
      : ''
    return { host, prefix }
  }
  get schema() {
    const schema = (value: any) =>
      value === undefined
        ? undefined
        : value instanceof z.ZodType
          ? value
          : z.fromJSONSchema(value)
    return {
      body: schema(this.contract?.input?.body),
      query: schema(this.contract?.input?.query)
    }
  }
  get key(): unknown[] {
    const segments = [this.target.prefix, this.route]
      .flatMap(part => part.split('/'))
      .filter(Boolean)
    return this._input ? [...segments, this._input] : segments
  }
  get endpoint(): string {
    const { host, prefix } = this.target
    const absolute = host.startsWith('/') ? browserOrigin() + host : host
    return new URL(
      this._getPath(prefix).replace(/^\/+/, ''),
      absolute.replace(/\/+$/, '') + '/'
    ).href
  }
  setHost(host: string): this {
    this.host = host
    return this
  }
  input(value: InferRawInput<T>['query']): this {
    const copy = joinObjectsRecursively({}, this._input ?? {})
    this._input = joinObjectsRecursively(copy, value as Record<string, any>)
    return this
  }
  protected _getPath(prefix = ''): string {
    const search = Object.entries(this._input ?? {})
      .flatMap(([name, value]) =>
        value === undefined
          ? []
          : [encodeURIComponent(name) + '=' + encodeURIComponent(String(value))]
      )
      .join('&')
    return (
      [prefix, this.route].filter(Boolean).join('/') +
      (search ? '?' + search : '')
    )
  }
  query(): Promise<InferRawOutput<T>> {
    const { host, prefix } = this.target
    return encryptedRequest(host, this._getPath(prefix), 'GET')
  }
  mutate(body: InferRawInput<T>['body']): Promise<InferRawOutput<T>> {
    if (isForm(body) || hasFile(body)) return this.mutateRaw(body)
    const { host, prefix } = this.target
    return encryptedRequest(host, this._getPath(prefix), 'POST', body)
  }
  private send(method: 'GET' | 'POST', body: any, options: TransportOptions) {
    const { host, prefix } = this.target
    const { raw, ...transport } = options
    const settings = {
      ...transport,
      method,
      ...(method === 'POST'
        ? {
            body: isForm(body)
              ? body
              : hasFile(body)
                ? getFormData(body)
                : (body ?? {})
          }
        : {})
    }
    const path = this._getPath(prefix)
    return raw
      ? fetchAPI<InferRawOutput<T>>(host, path, { ...settings, raw: true })
      : fetchAPI<InferRawOutput<T>>(host, path, settings)
  }
  queryRaw(options: TransportOptions & { raw: true }): Promise<RawResult<T>>
  queryRaw(
    options?: TransportOptions & { raw?: false }
  ): Promise<InferRawOutput<T>>
  queryRaw(
    options: TransportOptions = {}
  ): Promise<RawResult<T> | InferRawOutput<T>> {
    return this.send('GET', undefined, options)
  }
  mutateRaw(
    body: InferRawInput<T>['body'] | FormData,
    options: TransportOptions & { raw: true }
  ): Promise<RawResult<T>>
  mutateRaw(
    body: InferRawInput<T>['body'] | FormData,
    options?: TransportOptions & { raw?: false }
  ): Promise<InferRawOutput<T>>
  mutateRaw(
    body: InferRawInput<T>['body'] | FormData,
    options: TransportOptions = {}
  ): Promise<RawResult<T> | InferRawOutput<T>> {
    return this.send('POST', body, options)
  }
  private querySettings(
    raw: boolean,
    options: QueryOptions
  ): UseQueryOptions<InferRawOutput<T>> {
    const key = options.queryKey ?? this.key
    return {
      retry: false,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      ...options,
      queryKey: raw ? [...key, 'raw'] : key,
      queryFn: () => (raw ? this.queryRaw() : this.query())
    }
  }
  queryOptions(options: QueryOptions = {}) {
    return this.querySettings(false, options)
  }
  rawQueryOptions(options: QueryOptions = {}) {
    return this.querySettings(true, options)
  }
  private mutationSettings(
    raw: boolean,
    options: MutationOptions<T>
  ): UseMutationOptions<InferRawOutput<T>, any, InferRawInput<T>['body']> {
    return {
      retry: false,
      ...options,
      mutationKey: raw ? [...this.key, 'raw'] : this.key,
      mutationFn: body => (raw ? this.mutateRaw(body) : this.mutate(body))
    }
  }
  mutationOptions(options: MutationOptions<T> = {}) {
    return this.mutationSettings(false, options)
  }
  rawMutationOptions(options: MutationOptions<T> = {}) {
    return this.mutationSettings(true, options)
  }
}
