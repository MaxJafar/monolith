import { z } from 'zod'

import {
  type Edge,
  type FlowNode,
  type Graph,
  type Payload,
  graphSchema,
  starterGraph,
  validateGraph
} from './shared'

const object = z.record(z.string(), z.unknown())
/** Fail closed on unsupported semantics instead of silently changing a workflow. */
export function importWorkflow(text: string): {
  title: string
  description: string
  graph: Graph
  interval_minutes: number
} {
  if (text.length > 500_000) throw Error('Import is limited to 500 KB')
  const raw: unknown = JSON.parse(text)
  if (!Array.isArray(raw)) {
    const value = object.parse(raw)
    if (value.graph)
      return {
        title: String(value.title ?? 'Imported workflow').slice(0, 120),
        description: String(value.description ?? '').slice(0, 1000),
        graph: validateGraph(value.graph),
        interval_minutes: z
          .number()
          .int()
          .min(0)
          .max(525600)
          .parse(value.interval_minutes ?? 0)
      }
    if (value.version === 1)
      return {
        title: 'Imported workflow',
        description: '',
        graph: validateGraph(value),
        interval_minutes: 0
      }
    if (Array.isArray(value.nodes) && value.connections) {
      const nodes: FlowNode[] = value.nodes.map((item, index) => {
        const n = object.parse(item),
          params = object.parse(n.parameters ?? {}),
          position = z
            .array(z.number())
            .parse(n.position ?? [index * 300 + 80, 160])
        const kind =
          n.type === 'n8n-nodes-base.manualTrigger'
            ? 'trigger'
            : n.type === 'n8n-nodes-base.noOp'
              ? 'output'
              : null
        if (!kind || Object.keys(params).length)
          throw Error(
            `Unsupported n8n node: ${String(n.name)} (${String(n.type)}). Import supports manualTrigger and noOp; recreate other actions explicitly.`
          )
        return {
          id: String(n.name),
          name: String(n.name),
          kind,
          x: Math.max(0, position[0] ?? 0),
          y: Math.max(0, position[1] ?? 0),
          config: {}
        }
      })
      const edges: Edge[] = []
      for (const [source, entry] of Object.entries(
        object.parse(value.connections)
      )) {
        const ports = object.parse(entry)
        if (Object.keys(ports).some(key => key !== 'main'))
          throw Error('Only main connections are supported')
        const outputs = z.array(z.array(object)).parse(ports.main ?? [])
        if (outputs.length > 1) throw Error('Unsupported n8n output structure')
        for (const target of outputs[0] ?? [])
          edges.push({
            id: `e${edges.length}`,
            source,
            target: String(target.node),
            port: 'main'
          })
      }
      return {
        title: String(value.name ?? 'Imported n8n workflow').slice(0, 120),
        description: '',
        graph: validateGraph({ version: 1, nodes, edges }),
        interval_minutes: 0
      }
    }
  } else {
    const entries = raw
      .map(item => object.parse(item))
      .filter(n => n.type !== 'tab' && n.type !== 'comment')
    const edges: Edge[] = [],
      nodes: FlowNode[] = []
    for (const n of entries) {
      let kind: FlowNode['kind'],
        config: Payload = {}
      if (n.type === 'inject') {
        if (n.repeat || n.crontab || n.once === true)
          throw Error('Configure the imported schedule explicitly in Monolith')
        if (
          (n.payload !== undefined && n.payload !== '') ||
          (Array.isArray(n.props) &&
            n.props.some(p => object.parse(p).p !== 'payload'))
        )
          throw Error(
            'Import requires an empty inject payload; supply trigger data when running'
          )
        kind = 'trigger'
      } else if (n.type === 'debug') kind = 'output'
      else if (n.type === 'change') {
        kind = 'set'
        const values: Payload = {}
        for (const r of z.array(object).parse(n.rules)) {
          if (
            r.t !== 'set' ||
            r.pt !== 'msg' ||
            !['str', 'num', 'bool', 'json'].includes(String(r.tot))
          )
            throw Error('Only literal msg set rules are supported')
          values[String(r.p)] =
            r.tot === 'str' ? String(r.to) : JSON.parse(String(r.to))
        }
        config = { values }
      } else
        throw Error(
          `Unsupported Node-RED node: ${String(n.name ?? n.id)} (${String(n.type)}). Recreate this action explicitly.`
        )
      nodes.push({
        id: String(n.id),
        name: String(n.name || n.type),
        kind,
        config,
        x: Math.max(0, Number(n.x ?? 80)),
        y: Math.max(0, Number(n.y ?? 160))
      })
      const outputs = z.array(z.array(z.string())).parse(n.wires ?? [])
      if (outputs.length > 1)
        throw Error('Only a single output is supported for imported nodes')
      for (const target of outputs[0] ?? [])
        edges.push({
          id: `e${edges.length}`,
          source: String(n.id),
          target,
          port: 'main'
        })
    }
    return {
      title: 'Imported Node-RED flow',
      description: '',
      graph: validateGraph({ version: 1, nodes, edges }),
      interval_minutes: 0
    }
  }
  throw Error(
    'Choose a Monolith workflow, supported n8n workflow or Node-RED flow JSON file'
  )
}

export function templateGraph(kind: 'starter' | 'branch' | 'request'): Graph {
  const graph = starterGraph()
  if (kind === 'request')
    graph.nodes[1] = {
      ...graph.nodes[1]!,
      kind: 'http',
      name: 'Fetch JSON',
      config: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        body: {}
      }
    }
  if (kind === 'branch') {
    graph.nodes[1] = {
      ...graph.nodes[1]!,
      kind: 'condition',
      name: 'Check priority',
      config: { path: 'priority', operator: 'equals', value: 'high' }
    }
    graph.nodes[2]!.name = 'High priority'
    graph.nodes[2]!.y = 80
    graph.nodes.push({
      id: 'other',
      kind: 'output',
      name: 'Everything else',
      x: 680,
      y: 300,
      config: {}
    })
    graph.edges[1]!.port = 'true'
    graph.edges.push({
      id: 'otherwise',
      source: 'data',
      target: 'other',
      port: 'false'
    })
  }
  return graphSchema.parse(graph)
}
