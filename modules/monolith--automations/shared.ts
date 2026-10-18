import { z } from 'zod'

export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json }
export type Payload = Record<string, unknown>
// JSON validation stays at the boundary; opaque fields keep generated clients finite.
export const payloadSchema = z
  .record(z.string(), z.unknown())
  .superRefine((value, context) => {
    if (!z.json().safeParse(value).success)
      context.addIssue({ code: 'custom', message: 'Expected JSON data' })
  })
export const kinds = [
  'trigger',
  'set',
  'condition',
  'http',
  'delay',
  'output'
] as const
export const nodeSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(kinds),
  name: z.string().trim().min(1).max(100),
  x: z.number().finite().min(0).max(10000),
  y: z.number().finite().min(0).max(10000),
  config: payloadSchema
})
export const edgeSchema = z.object({
  id: z.string().min(1).max(80),
  source: z.string(),
  target: z.string(),
  port: z.enum(['main', 'true', 'false'])
})
export const graphSchema = z.object({
  version: z.literal(1),
  nodes: z.array(nodeSchema).min(1).max(100),
  edges: z.array(edgeSchema).max(200)
})
export type FlowNode = z.infer<typeof nodeSchema>
export type Graph = z.infer<typeof graphSchema>
export type Edge = z.infer<typeof edgeSchema>
export const scopeSchema = z.object({ workspace_id: z.string().uuid() })
export const workflowSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(1000),
  graph: graphSchema,
  enabled: z.boolean(),
  revision: z.number().int().positive(),
  interval_minutes: z.number().int().min(0).max(525600),
  created: z.string(),
  updated: z.string()
})
export type Workflow = z.infer<typeof workflowSchema>
export const stepSchema = z.object({
  node_id: z.string(),
  name: z.string(),
  status: z.enum(['success', 'error']),
  duration_ms: z.number(),
  input: payloadSchema,
  output: payloadSchema.nullable(),
  port: z.string(),
  error: z.string().optional()
})
export const resultSchema = z.object({
  status: z.enum(['success', 'error']),
  steps: z.array(stepSchema),
  output: z.array(payloadSchema),
  duration_ms: z.number(),
  error: z.string().optional()
})
export type RunResult = z.infer<typeof resultSchema>
export const runSchema = resultSchema.extend({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  revision: z.number(),
  trigger: z.enum(['manual', 'schedule', 'event']),
  started: z.string()
})
export type Run = z.infer<typeof runSchema>

const forbidden = new Set(['__proto__', 'prototype', 'constructor'])
export function pathParts(path: string) {
  const parts = path
    .replace(/^\$json\./, '')
    .replace(/^msg\./, '')
    .split('.')
  if (!parts.length || parts.some(part => !part || forbidden.has(part)))
    throw Error('Use a dot-separated data path without prototype properties')
  return parts
}
export function readPath(value: Payload, path: string): unknown {
  let current: unknown = value
  for (const key of pathParts(path)) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, key)
    )
      return undefined
    current = (current as Payload)[key]
  }
  return current
}
export function writePath(value: Payload, path: string, next: Json) {
  const parts = pathParts(path)
  let target = value
  for (const key of parts.slice(0, -1)) {
    const child = Object.hasOwn(target, key) ? target[key] : undefined
    if (!child || typeof child !== 'object' || Array.isArray(child))
      target[key] = {}
    target = target[key] as Payload
  }
  target[parts.at(-1)!] = next
}
export function interpolate(value: unknown, input: Payload): Json {
  if (typeof value === 'string') {
    const whole = /^\{\{\s*([^{}]+?)\s*\}\}$/.exec(value)
    if (whole)
      return z
        .json()
        .parse(structuredClone(readPath(input, whole[1]!.trim()) ?? null))
    return value.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, path: string) => {
      const item = readPath(input, path.trim())
      return item === undefined || item === null
        ? ''
        : typeof item === 'object'
          ? JSON.stringify(item)
          : String(item)
    })
  }
  if (Array.isArray(value)) return value.map(item => interpolate(item, input))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        pathParts(key)
        return [key, interpolate(item, input)]
      })
    )
  return z.json().parse(value)
}

/** Reject invalid graphs before either persistence or execution. */
export function validateGraph(raw: unknown): Graph {
  const graph = graphSchema.parse(raw)
  if (JSON.stringify(graph).length > 250_000)
    throw Error('Workflow exceeds 250 KB')
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  if (byId.size !== graph.nodes.length) throw Error('Node IDs must be unique')
  const triggers = graph.nodes.filter(node => node.kind === 'trigger')
  if (triggers.length !== 1) throw Error('A workflow needs exactly one trigger')
  const edgeIds = new Set<string>(),
    wires = new Set<string>()
  for (const edge of graph.edges) {
    const from = byId.get(edge.source),
      to = byId.get(edge.target)
    if (!from || !to) throw Error('A connection references a missing node')
    if (to.kind === 'trigger')
      throw Error('Triggers cannot have incoming connections')
    if (from.kind === 'output')
      throw Error('Output nodes cannot have outgoing connections')
    if (from.kind === 'condition' ? edge.port === 'main' : edge.port !== 'main')
      throw Error('Invalid output port')
    const wire = `${edge.source}:${edge.port}:${edge.target}`
    if (edgeIds.has(edge.id) || wires.has(wire))
      throw Error('Duplicate connection')
    edgeIds.add(edge.id)
    wires.add(wire)
  }
  const visiting = new Set<string>(),
    visited = new Set<string>()
  function visit(id: string) {
    if (visiting.has(id))
      throw Error('Loops are not supported; remove the circular connection')
    if (visited.has(id)) return
    visiting.add(id)
    for (const edge of graph.edges.filter(edge => edge.source === id))
      visit(edge.target)
    visiting.delete(id)
    visited.add(id)
  }
  for (const node of graph.nodes) {
    visit(node.id)
    if (node.kind === 'set') {
      if (
        !node.config.values ||
        typeof node.config.values !== 'object' ||
        Array.isArray(node.config.values)
      )
        throw Error(`${node.name}: values must be a JSON object`)
      for (const path of Object.keys(node.config.values)) pathParts(path)
    }
    if (node.kind === 'condition') {
      pathParts(String(node.config.path ?? ''))
      if (
        !['equals', 'notEquals', 'contains', 'greater', 'exists'].includes(
          String(node.config.operator)
        )
      )
        throw Error(`${node.name}: choose a supported comparison`)
    }
    if (
      node.kind === 'delay' &&
      (!Number.isInteger(node.config.ms) ||
        Number(node.config.ms) < 0 ||
        Number(node.config.ms) > 5000)
    )
      throw Error(`${node.name}: delay must be 0–5000 ms`)
    if (node.kind === 'http') {
      if (
        typeof node.config.url !== 'string' ||
        !/^https?:\/\//.test(node.config.url)
      )
        throw Error(`${node.name}: enter an HTTP or HTTPS URL`)
      if (!['GET', 'POST'].includes(String(node.config.method)))
        throw Error(`${node.name}: choose GET or POST`)
    }
  }
  return graph
}

export const defaultConfig: Record<FlowNode['kind'], Payload> = {
  trigger: {},
  set: { values: { message: 'Hello from Monolith' } },
  condition: { path: 'message', operator: 'exists', value: '' },
  http: { method: 'GET', url: 'https://example.com', body: {} },
  delay: { ms: 500 },
  output: {}
}
export function starterGraph(): Graph {
  return {
    version: 1,
    nodes: [
      {
        id: 'start',
        kind: 'trigger',
        name: 'Start',
        x: 80,
        y: 160,
        config: {}
      },
      {
        id: 'data',
        kind: 'set',
        name: 'Prepare data',
        x: 380,
        y: 160,
        config: { values: { message: 'Hello from Monolith' } }
      },
      {
        id: 'result',
        kind: 'output',
        name: 'Result',
        x: 680,
        y: 160,
        config: {}
      }
    ],
    edges: [
      { id: 'first', source: 'start', target: 'data', port: 'main' },
      { id: 'second', source: 'data', target: 'result', port: 'main' }
    ]
  }
}
