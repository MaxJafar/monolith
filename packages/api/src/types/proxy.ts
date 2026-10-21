// SPDX-License-Identifier: 0BSD
import type { ZodTypeAny } from 'zod'

import type { EndpointClient } from '../proxy/endpointClient'
import type { CoreHelperReturnTypes } from '../proxy/helpers/config'
import type {
  InferContractInput,
  InferContractMedia,
  InferContractOutput
} from './contract'

export type UntypedEndpointType<Output = any, Body = any, Query = any> = {
  __isEndpointContract: true
  __input: { body: Body; query: Query }
  __output: Output
  __media: null
}
type Navigation = {
  key: (string | Record<string, any> | null)[]
  endpoint: string
  schema: { body?: ZodTypeAny; query?: ZodTypeAny }
  getMedia(options: { key: string; thumb?: string; download?: string }): string
}
type RouteClient<Route> = EndpointClient<{
  __isEndpointContract: true
  __input: InferContractInput<Route>
  __output: InferContractOutput<Route>
  __media: InferContractMedia<Route>
}>
type Directory<Routes> = Navigation & {
  [Name in keyof Routes]: Routes[Name] extends { readonly method: string }
    ? RouteClient<Routes[Name]>
    : Directory<Routes[Name]>
}
type RootMethods = Navigation &
  CoreHelperReturnTypes & {
    untyped<Output = any, Body = any, Query = any>(
      path: string
    ): EndpointClient<UntypedEndpointType<Output, Body, Query>>
  }
export type ProxyTree<Routes> = RootMethods &
  (0 extends 1 & Routes ? Record<string, any> : Directory<Routes>)
