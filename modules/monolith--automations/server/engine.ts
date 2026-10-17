import { setTimeout as delay } from 'node:timers/promises'

import {
  type Graph,
  type Json,
  type Payload,
  type RunResult,
  interpolate,
  readPath,
  validateGraph,
  writePath
} from '../shared'

export type HTTPAction = (config: Payload, signal: AbortSignal) => Promise<Json>

export async function executeGraph(
  raw: Graph,
  input: Payload,
  http: HTTPAction,
  signal: AbortSignal = AbortSignal.timeout(30000)
): Promise<RunResult> {
  const graph = validateGraph(raw)
  if (JSON.stringify(input).length > 100_000)
    throw Error('Trigger data exceeds 100 KB')
  const started = performance.now(),
    steps: RunResult['steps'] = [],
    output: Payload[] = []
  const queue = [
    {
      nodeId: graph.nodes.find(node => node.kind === 'trigger')!.id,
      data: structuredClone(input)
    }
  ]
  let totalBytes = 0
  try {
    while (queue.length) {
      signal.throwIfAborted()
      if (steps.length >= 200) throw Error('Execution exceeded 200 node visits')
      const event = queue.shift()!,
        node = graph.nodes.find(node => node.id === event.nodeId)!
      const tick = performance.now(),
        before = structuredClone(event.data)
      let data = structuredClone(event.data),
        port = 'main'
      try {
        if (node.kind === 'set') {
          for (const [path, value] of Object.entries(
            node.config.values as Payload
          ))
            writePath(data, path, interpolate(value, before))
        } else if (node.kind === 'condition') {
          const actual = readPath(data, String(node.config.path)),
            expected = interpolate(node.config.value ?? null, data)
          const pass =
            node.config.operator === 'exists'
              ? actual !== undefined && actual !== null
              : node.config.operator === 'equals'
                ? JSON.stringify(actual) === JSON.stringify(expected)
                : node.config.operator === 'notEquals'
                  ? JSON.stringify(actual) !== JSON.stringify(expected)
                  : node.config.operator === 'contains'
                    ? typeof actual === 'string' &&
                      typeof expected === 'string' &&
                      actual.includes(expected)
                    : typeof actual === 'number' &&
                      typeof expected === 'number' &&
                      actual > expected
          port = pass ? 'true' : 'false'
        } else if (node.kind === 'http')
          data = {
            ...data,
            http: await http(interpolate(node.config, data) as Payload, signal)
          }
        else if (node.kind === 'delay')
          await delay(Number(node.config.ms), undefined, { signal })
        signal.throwIfAborted()
        const size = JSON.stringify(data).length + JSON.stringify(before).length
        totalBytes += size
        if (size > 200_000 || totalBytes > 2_000_000)
          throw Error('Execution data limit exceeded')
        steps.push({
          node_id: node.id,
          name: node.name,
          status: 'success',
          duration_ms: Math.round(performance.now() - tick),
          input: before,
          output: structuredClone(data),
          port
        })
        const next = graph.edges.filter(
          edge => edge.source === node.id && edge.port === port
        )
        if (node.kind === 'output' || !next.length) output.push(data)
        for (const edge of next) {
          if (queue.length >= 200) throw Error('Execution queue limit exceeded')
          queue.push({ nodeId: edge.target, data: structuredClone(data) })
        }
      } catch (cause) {
        const error = cause instanceof Error ? cause.message : String(cause)
        steps.push({
          node_id: node.id,
          name: node.name,
          status: 'error',
          duration_ms: Math.round(performance.now() - tick),
          input: before,
          output: null,
          port,
          error
        })
        throw cause
      }
    }
    return {
      status: 'success',
      steps,
      output,
      duration_ms: Math.round(performance.now() - started)
    }
  } catch (cause) {
    return {
      status: 'error',
      steps,
      output,
      duration_ms: Math.round(performance.now() - started),
      error: cause instanceof Error ? cause.message : String(cause)
    }
  }
}
