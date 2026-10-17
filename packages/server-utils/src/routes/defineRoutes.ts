import { Router } from 'express'

export interface RouterInput {
  [key: string]:
    | Router
    | {
        __isEndpointContract: true
      }
    | RouterInput
}

export type EndpointTree<T extends RouterInput> = T

/**
 * A utility function to define a router configuration object.
 *
 * This function serves as a type-safe way to create a router configuration
 * object that maps route names to either endpointBuilder instances,
 * Express Router instances, or nested router objects. It ensures that the
 * provided routes conform to the expected structure defined by the RouterInput type.
 *
 * @template T - The type of the router input configuration, extending RouterInput
 * @param routes - An object mapping route names to controllers, routers, or nested objects
 * @returns The same routes object, typed as T
 *
 * @example
 * ```typescript
 * const routes = defineRoutes({
 *   users: endpoints.query()...,
 *   posts: {
 *     list: endpoints.query()...,
 *     create: endpoints.mutation()...
 *   },
 * });
 * ```
 */
export default function defineRoutes<T extends RouterInput>(routes: T): T {
  return routes
}
