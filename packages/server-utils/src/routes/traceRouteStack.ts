// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

export type Route = {
  method: string
  path: string
  description: string
  schema: {
    response: unknown
    params?: unknown
    body?: unknown
    query?: unknown
  }
  noAuth?: boolean
  encrypted?: boolean
  isDownloadable?: boolean
  media?: unknown
  input?: { query?: unknown; body?: unknown }
  output?: unknown
  callerModule?: { source: string; id: string }
}
export interface RouteStackLayer {
  regexp?: { toString(): string; source?: string; fast_slash?: boolean }
  monolithMountPath?: string
  route?: {
    path?: string | string[]
    methods?: Record<string, boolean>
    stack?: RouteStackLayer[]
  }
  handle?: unknown
}
type Handler = { stack?: RouteStackLayer[]; meta?: Partial<Route> }
function join(left: string, right: string) {
  return (left + '/' + right)
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/^/, '/')
}
function mount(layer: RouteStackLayer) {
  if (layer.monolithMountPath !== undefined) return layer.monolithMountPath
  if (!layer.regexp || layer.regexp.fast_slash) return ''
  const expression =
    layer.regexp.source ??
    layer.regexp
      .toString()
      .replace(/^\//, '')
      .replace(/\/[a-z]*$/, '')
  return expression
    .replace(/^\^/, '')
    .split('(?=')[0]!
    .replace(/\\\/\?$/, '')
    .replace(/\\\//g, '/')
}
export default function traceRouteStack(
  stack: RouteStackLayer[],
  prefix = '',
  routes: Route[] = []
): Route[] {
  const active = new Set<RouteStackLayer[]>([stack])
  const frames = [{ layers: stack, index: 0, path: prefix }]
  while (frames.length) {
    const current = frames[frames.length - 1]!
    if (current.index === current.layers.length) {
      active.delete(current.layers)
      frames.pop()
      continue
    }
    const layer = current.layers[current.index++]!
    const handler = layer.handle as Handler | undefined
    if (!layer.route) {
      const child = handler?.stack
      if (Array.isArray(child) && !active.has(child)) {
        active.add(child)
        frames.push({
          layers: child,
          index: 0,
          path: join(current.path, mount(layer))
        })
      }
      continue
    }
    const route = layer.route
    let meta: Partial<Route> | undefined
    for (const item of route.stack ?? []) {
      const candidate = (item.handle as Handler | undefined)?.meta
      if (candidate) meta = candidate
    }
    const methods = Object.keys(route.methods ?? {}).filter(
      key => route.methods![key]
    )
    const paths = Array.isArray(route.path) ? route.path : [route.path ?? '']
    for (const path of paths) {
      if (path === '*') continue
      for (const method of methods.length ? methods : ['get'])
        routes.push({
          ...meta,
          method: method.toUpperCase(),
          path: join(current.path, path),
          description: meta?.description ?? '',
          schema: meta?.schema ?? { response: z.null() }
        })
    }
  }
  return routes
}
