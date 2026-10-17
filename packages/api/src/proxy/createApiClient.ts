import type { ProxyTree, UntypedEndpointType } from '../types/proxy'
import { EndpointClient } from './endpointClient'
import { CORE_HELPERS } from './helpers/config'
import { createCoreHelper } from './helpers/createCoreHelper'
import { createGetMediaHelper } from './helpers/getMediaHelper'
import { globalProxyRegistry } from './registry'

/** Route properties are resolved before methods so routes can be named query or mutate. */
export function createApiClient<T>(contract: T): ProxyTree<T> {
  const host = () =>
    globalProxyRegistry.get(contract as object)?.apiHost ||
    globalProxyRegistry.apiHost ||
    ''
  const descend = (segments: string[], node: any): any => {
    const route = segments.join('/')
    const client = new EndpointClient<any>(host(), route, node, contract)
    const inspect = () => `[Monolith API: ${route || '/'}]`
    const callable = () => {
      throw new TypeError(`Use query() or mutate() for the /${route} endpoint`)
    }
    return new Proxy(callable, {
      get(_target, key) {
        if (key === Symbol.toStringTag) return 'MonolithApi'
        if (key === Symbol.toPrimitive) return inspect
        if (
          typeof key !== 'string' ||
          ['then', 'name', 'length', 'prototype'].includes(key)
        )
          return undefined
        if (['toString', 'toJSON', 'valueOf'].includes(key)) return inspect
        if (
          node &&
          typeof node === 'object' &&
          typeof node.method !== 'string' &&
          Object.hasOwn(node, key)
        )
          return descend([...segments, key], node[key])
        if (!segments.length && key === 'untyped')
          return <O = any, B = any, Q = any>(path: string) =>
            new EndpointClient<UntypedEndpointType<O, B, Q>>(
              host(),
              path,
              undefined,
              contract
            )
        if (key === 'getMedia') return createGetMediaHelper(host())
        if (!segments.length && Object.hasOwn(CORE_HELPERS, key))
          return createCoreHelper(host(), key as keyof typeof CORE_HELPERS)
        if (key in client) {
          const member = Reflect.get(client, key, client)
          return typeof member === 'function' ? member.bind(client) : member
        }
        return descend([...segments, key], undefined)
      }
    })
  }
  return descend([], contract) as ProxyTree<T>
}
