// SPDX-License-Identifier: 0BSD
import type { FromSchema, JSONSchema } from 'json-schema-to-ts'
import type { ZodTypeAny } from 'zod'

type IsAny<Value> = 0 extends 1 & Value ? true : false
type NamedKey<Key> = string extends Key
  ? never
  : number extends Key
    ? never
    : symbol extends Key
      ? never
      : Key
type HasUnknownIndex<Value> = string extends keyof Value
  ? unknown extends Value[string]
    ? true
    : false
  : number extends keyof Value
    ? unknown extends Value[number]
      ? true
      : false
    : false

/** Schema generators may add an unconstrained index alongside named fields. */
export type OmitIndexSignature<Value> = Value extends readonly unknown[]
  ? Value
  : Value extends object
    ? {
        [
          Key in keyof Value as HasUnknownIndex<Value> extends true
            ? NamedKey<Key>
            : Key
        ]: OmitIndexSignature<Value[Key]>
      }
    : Value

export type InferFromJSONSchema<Schema> =
  IsAny<Schema> extends true
    ? any
    : Schema extends object & JSONSchema
      ? OmitIndexSignature<FromSchema<Schema>>
      : undefined

type FieldInput<Schema> = Schema extends ZodTypeAny
  ? Schema
  : InferFromJSONSchema<Schema>
type ContractInputs<Route> = Route extends {
  readonly input?: { readonly body?: infer Body; readonly query?: infer Query }
}
  ? { body: FieldInput<Body>; query: FieldInput<Query> }
  : { body: undefined; query: undefined }

export type InferContractInput<Route> =
  IsAny<Route> extends true ? any : ContractInputs<Route>

type SuccessName = 'OK' | 'CREATED' | 'ACCEPTED' | 'NO_CONTENT'
type SuccessData<Responses> = {
  [Status in Extract<keyof Responses, SuccessName>]: Status extends 'NO_CONTENT'
    ? Responses[Status] extends true
      ? void
      : never
    : InferFromJSONSchema<Responses[Status]>
}[Extract<keyof Responses, SuccessName>]
type ResponseData<Responses> = Responses extends 'custom'
  ? any
  : [SuccessData<Responses>] extends [never]
    ? any
    : SuccessData<Responses>

export type InferContractOutput<Route> =
  IsAny<Route> extends true
    ? any
    : Route extends { readonly output: infer Responses }
      ? ResponseData<Responses>
      : never

export type InferContractMedia<Route> =
  IsAny<Route> extends true
    ? any
    : Route extends { readonly media?: infer Media }
      ? Media extends undefined
        ? null
        : Media
      : null
