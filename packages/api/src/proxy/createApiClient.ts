// SPDX-License-Identifier: 0BSD
import type { ProxyTree, UntypedEndpointType } from '../types/proxy'
import { EndpointClient } from './endpointClient'
import { CORE_HELPERS, type CoreHelperName } from './helpers/config'
import { createCoreHelper } from './helpers/createCoreHelper'
import { createGetMediaHelper } from './helpers/getMediaHelper'
import { globalProxyRegistry } from './registry'

const methods = new Set([
  'input',
  'setHost',
  'query',
  'mutate',
  'queryRaw',
  'mutateRaw',
  'queryOptions',
  'rawQueryOptions',
  'mutationOptions',
  'rawMutationOptions',
  'key',
  'endpoint',
  'schema'
])
const reserved = new Set([
  'then',
  'name',
  'length',
  'prototype',
  '__proto__',
  'constructor'
])

export function createApiClient<Routes>(contract: Routes): ProxyTree<Routes> {
  const root = contract && typeof contract === 'object' ? contract : undefined
  const host = () =>
    (root && globalProxyRegistry.get(root)?.apiHost) ||
    globalProxyRegistry.apiHost
  function branch(path: string[], schema: any): any {
    const route = path.join('/')
    const endpoint = new EndpointClient<any>(host(), route, schema, root)
    const label = () => '[Monolith API: ' + (route || '/') + ']'
    const target = () => {
      throw new TypeError(
        'Call query() or mutate() on the /' + route + ' endpoint'
      )
    }
    return new Proxy(target, {
      get(_target, property) {
        if (property === Symbol.toPrimitive) return label
        if (property === Symbol.toStringTag) return 'MonolithApi'
        if (typeof property !== 'string' || reserved.has(property))
          return undefined
        if (['toString', 'toJSON', 'valueOf'].includes(property)) return label
        if (
          schema &&
          typeof schema === 'object' &&
          typeof schema.method !== 'string' &&
          Object.hasOwn(schema, property)
        )
          return branch([...path, property], schema[property])
        if (property === 'getMedia')
          return (
            options: Parameters<ReturnType<typeof createGetMediaHelper>>[0]
          ) => createGetMediaHelper(host())(options)
        if (path.length === 0) {
          if (property === 'untyped')
            return <Output = any, Body = any, Query = any>(url: string) =>
              new EndpointClient<UntypedEndpointType<Output, Body, Query>>(
                host(),
                url,
                undefined,
                root
              )
          if (Object.hasOwn(CORE_HELPERS, property))
            return createCoreHelper(host(), property as CoreHelperName)
        }
        if (!methods.has(property))
          return branch([...path, property], undefined)
        const member = Reflect.get(endpoint, property)
        return typeof member === 'function' ? member.bind(endpoint) : member
      }
    })
  }
  return branch([], contract)
}
