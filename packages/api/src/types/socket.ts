// SPDX-License-Identifier: 0BSD
import type {
  ZodIntersection,
  ZodObject,
  ZodRawShape,
  ZodTypeAny,
  z
} from 'zod'

import type { EndpointClient } from '../proxy/endpointClient'

type ObjectSchema =
  ZodObject<ZodRawShape> | ZodIntersection<ZodTypeAny, ZodTypeAny>
type InputValue<Value> = Value extends ObjectSchema ? z.input<Value> : Value
type Upload<Rule> = Rule extends { multiple: true }
  ? Rule extends { optional: true }
    ? File[] | undefined
    : File[]
  : Rule extends { optional: true }
    ? File | string | undefined
    : File | string
type UploadFields<Media> = { [Field in keyof Media]: Upload<Media[Field]> }
type WithUploads<Body, Media> = Media extends null
  ? InputValue<Body>
  : (Body extends undefined ? {} : InputValue<Body>) & UploadFields<Media>

type RequestValues<Input, Media> = Input extends {
  body?: infer Body
  query?: infer Query
}
  ? { body: WithUploads<Body, Media>; query: InputValue<Query> }
  : never

export type InferRawInput<Contract> = Contract extends {
  __isEndpointContract: true
  __input: infer Input
  __media: infer Media
}
  ? RequestValues<Input, Media>
  : never

export type InferRawOutput<Contract> = Contract extends {
  __isEndpointContract: true
  __output: infer Output
}
  ? Output
  : never

export type InferInput<Client extends EndpointClient> = InferRawInput<
  Client['__type']
>
export type InferOutput<Client extends EndpointClient> = InferRawOutput<
  Client['__type']
>
