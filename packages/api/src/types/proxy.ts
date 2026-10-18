/* eslint-disable @typescript-eslint/no-explicit-any */
import type z from 'zod'

import type { EndpointClient } from '../proxy/endpointClient'
import type { CoreHelperReturnTypes } from '../proxy/helpers/config'
import type {
  InferContractInput,
  InferContractMedia,
  InferContractOutput
} from './contract'

/**
 * Constructs a deeply-nested proxy tree from a server route schema.
 * Each endpoint becomes a `EndpointClient`, nested groups become more `ProxyTree`.
 */

type ProxyTreeLeaf = {
  getMedia: (params: {
    key: string
    thumb?: string
    download?: string
  }) => string
  key: (string | Record<string, any> | null)[]
  schema: { query?: z.ZodTypeAny; body?: z.ZodTypeAny }
  endpoint: string
}

type ProxyTreeRootLeaf = ProxyTreeLeaf & {
  untyped: <TOutput = any, TBody = any, TQuery = any>(
    url: string
  ) => EndpointClient<UntypedEndpointType<TOutput, TBody, TQuery>>
}

type ProxyTreeInternal<T> = {
  [K in keyof T]: T[K] extends { readonly method: string }
    ? EndpointClient<{
        __isEndpointContract: true
        __input: InferContractInput<T[K]>
        __output: InferContractOutput<T[K]>
        __media: InferContractMedia<T[K]>
      }>
    : ProxyTreeInternal<T[K]>
} & ProxyTreeLeaf

/** ProxyTree falls back to `AnyProxyTree` without strict typing when the contract is untyped (`any`). */

type IsAny<T> = 0 extends 1 & T ? true : false

type AnyProxyTree = {
  [K: string]: any
} & ProxyTreeRootLeaf &
  CoreHelperReturnTypes

type TypedProxyTree<T> = ProxyTreeInternal<T> &
  ProxyTreeRootLeaf &
  CoreHelperReturnTypes

export type ProxyTree<T> =
  IsAny<T> extends true ? AnyProxyTree : TypedProxyTree<T>

/**
 * Helper type for creating untyped endpoints.
 */
export type UntypedEndpointType<TOutput = any, TBody = any, TQuery = any> = {
  __isEndpointContract: true
  __input: { body: TBody; query: TQuery }
  __output: TOutput
  __media: null
}
