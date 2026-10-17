/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {
  ZodIntersection,
  ZodObject,
  ZodRawShape,
  ZodTypeAny,
  z
} from 'zod'

import type { EndpointClient } from '../proxy/endpointClient'

type ZodObjectOrIntersection =
  ZodObject<ZodRawShape> | ZodIntersection<ZodTypeAny, ZodTypeAny>

/**
 * Infers the input TypeScript type from a Monolith endpoint config object.
 * Uses embedded Zod schema definitions to produce a plain object type.
 */
export type InferRawInput<T> = T extends {
  __isEndpointContract: true
  __input: infer I
  __media: infer M
}
  ? I extends {
      body?: infer B
      query?: infer Q
    }
    ? {
        body: M extends null
          ? B extends ZodObjectOrIntersection
            ? z.input<B>
            : B
          : (B extends ZodObjectOrIntersection
              ? z.input<B>
              : B extends undefined
                ? {}
                : B) & {
              [K in keyof M]: M[K] extends { multiple: true }
                ? M[K] extends { optional: true }
                  ? File[] | undefined
                  : File[]
                : M[K] extends { optional: true }
                  ? File | string | undefined
                  : File | string
            }
        query: Q extends ZodObjectOrIntersection ? z.input<Q> : Q
      }
    : never
  : never

/**
 * Infers the output (response) TypeScript type from a Monolith endpoint config object.
 */
export type InferRawOutput<T> = T extends {
  __isEndpointContract: true
  __output: infer O
}
  ? O
  : never

/**
 * Extracts the input schema type from a `EndpointClient` instance.
 */
export type InferInput<T extends EndpointClient> = T['__type'] extends {
  __isEndpointContract: true
  __input: infer I
  __media: infer M
}
  ? I extends {
      body?: infer B
      query?: infer Q
    }
    ? {
        body: M extends null
          ? B extends ZodObjectOrIntersection
            ? z.input<B>
            : B
          : (B extends ZodObjectOrIntersection
              ? z.input<B>
              : B extends undefined
                ? {}
                : B) & {
              [K in keyof M]: M[K] extends { multiple: true }
                ? M[K] extends { optional: true }
                  ? File[] | undefined
                  : File[]
                : M[K] extends { optional: true }
                  ? File | string | undefined
                  : File | string
            }
        query: Q extends ZodObjectOrIntersection ? z.input<Q> : Q
      }
    : never
  : never

/**
 * Extracts the output (response) type from a `EndpointClient` instance.
 */
export type InferOutput<T extends EndpointClient> = T['__type'] extends {
  __isEndpointContract: true
  __output: infer O
}
  ? O
  : never
