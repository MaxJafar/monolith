import z from 'zod'

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

function mountPath(layer: RouteStackLayer): string {
  if (layer.monolithMountPath !== undefined) return layer.monolithMountPath
  if (!layer.regexp || layer.regexp.fast_slash) return ''
  const expression =
    layer.regexp.source ??
    layer.regexp
      .toString()
      .replace(/^\//, '')
      .replace(/\/[a-z]*$/, '')
  const literal = expression
    .split('(?=')[0]!
    .replace(/^\^/, '')
    .replace(/\\\/\?$/, '')
  return literal.replace(/\\\//g, '/').replace(/^\/|\/$/g, '')
}

function location(prefix: string, path: string): string {
  return (prefix + '/' + path).replace(/\/{2,}/g, '/')
}

/** Walk router layers without recursing into middleware or mistaking handler functions for routes. */
export default function traceRouteStack(
  stack: RouteStackLayer[],
  prefix = '',
  routes: Route[] = []
): Route[] {
  type Frame = {
    layer: RouteStackLayer
    prefix: string
    ancestors: Set<RouteStackLayer[]>
  }
  const pending: Frame[] = []
  const schedule = (
    layers: RouteStackLayer[],
    path: string,
    ancestors: Set<RouteStackLayer[]>
  ) => {
    if (ancestors.has(layers)) return
    const next = new Set(ancestors).add(layers)
    for (let index = layers.length - 1; index >= 0; index--)
      pending.push({ layer: layers[index]!, prefix: path, ancestors: next })
  }
  schedule(stack, prefix, new Set())
  while (pending.length) {
    const frame = pending.pop()!
    const route = frame.layer.route
    const handler = frame.layer.handle as Handler | undefined
    if (!route) {
      if (Array.isArray(handler?.stack))
        schedule(
          handler.stack,
          location(frame.prefix, mountPath(frame.layer)),
          frame.ancestors
        )
      continue
    }
    const meta = [...(route.stack ?? [])]
      .reverse()
      .map(item => (item.handle as Handler | undefined)?.meta)
      .find(Boolean)
    const methods = Object.entries(route.methods ?? {})
      .filter(([, enabled]) => enabled)
      .map(([method]) => method.toUpperCase())
    for (const path of [route.path ?? ''].flat()) {
      if (path === '*') continue
      for (const method of methods.length ? methods : ['GET'])
        routes.push({
          ...meta,
          method,
          path: location(frame.prefix, path),
          description: meta?.description ?? '',
          schema: meta?.schema ?? { response: z.null() }
        })
    }
  }
  return routes
}
