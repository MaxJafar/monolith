import { Router } from 'express'

import type { EndpointContract, RouterInput } from '@monolith/server-utils'

import { disableRateLimitForRoute } from '../../middlewares/rateLimitingMiddleware'
import { registerController } from './executeEndpoint'

type RouteEntry = { path: string; target: EndpointContract | Router }

function isEndpoint(value: unknown): value is EndpointContract {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isEndpointContract' in value &&
    value.__isEndpointContract === true &&
    'getValue' in value &&
    typeof value.getValue === 'function'
  )
}

function isExpressRouter(value: unknown): value is Router {
  return typeof value === 'function' && 'stack' in value && 'use' in value
}

/** Compile once, then mount. A module alias never captures unrelated core routes. */
export function compileRoutes(tree: RouterInput): RouteEntry[] {
  const scopes = new WeakMap<object, string | null>()
  const visiting = new Set<object>()
  const entries: RouteEntry[] = []

  function scope(branch: RouterInput): string | null {
    if (scopes.has(branch)) return scopes.get(branch)!
    if (visiting.has(branch))
      throw new Error('Route definitions contain a cycle')
    visiting.add(branch)
    const names = new Set<string | null>()
    for (const item of Object.values(branch)) {
      if (isEndpoint(item)) names.add(item.modulePathAlias || null)
      else if (!isExpressRouter(item) && item && typeof item === 'object')
        names.add(scope(item as RouterInput))
    }
    const name = names.size === 1 ? [...names][0]! : null
    visiting.delete(branch)
    scopes.set(branch, name)
    return name
  }

  function walk(branch: RouterInput, path: string[], alias: string[] | null) {
    const ownAlias = scope(branch)
    const aliasPath = alias ?? (ownAlias ? [ownAlias] : null)
    for (const [key, target] of Object.entries(branch)) {
      const segment = key.replaceAll('$', '--')
      const location = [...path, segment]
      const alternate = aliasPath ? [...aliasPath, segment] : null
      if (isEndpoint(target) || isExpressRouter(target)) {
        entries.push({ path: '/' + location.join('/'), target })
        if (alternate && alternate.join('/') !== location.join('/'))
          entries.push({ path: '/' + alternate.join('/'), target })
      } else if (target && typeof target === 'object') {
        walk(target as RouterInput, location, alternate)
      } else {
        throw new TypeError(
          `Invalid route definition at /${location.join('/')}`
        )
      }
    }
  }

  scope(tree)
  walk(tree, [], null)
  const unique = new Map<string, RouteEntry>()
  for (const entry of entries) {
    const method = isEndpoint(entry.target)
      ? entry.target.getValue().method
      : 'router'
    const key = `${method}:${entry.path}`
    const previous = unique.get(key)
    if (previous && previous.target !== entry.target)
      throw new Error(`Conflicting route: ${key}`)
    unique.set(key, entry)
  }
  return [...unique.values()]
}

export function registerRoutes(tree: RouterInput): Router {
  const router = Router()
  for (const { path, target } of compileRoutes(tree)) {
    if (isEndpoint(target)) {
      const config = target.getValue()
      if (!config.rateLimit) disableRateLimitForRoute(config.method, path)
      registerController(target, router, path.slice(1))
    } else {
      router.use(path, target)
      // Keep the mount path available without reverse-parsing Express internals.
      const mounted = router.stack.at(-1)
      if (mounted) Object.assign(mounted, { monolithMountPath: path })
    }
  }
  return router
}
