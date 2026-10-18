import { describe, expect, it } from 'vitest'

import { importWorkflow, templateGraph } from './import'
import { executeGraph } from './server/engine'
import { isPublicAddress } from './server/http'
import {
  type Graph,
  interpolate,
  starterGraph,
  validateGraph,
  writePath
} from './shared'

const http = async () => ({ status: 200, body: { ok: true } })
describe('workflow execution contract', () => {
  it('passes trigger data through field assignment into a captured result', async () => {
    const result = await executeGraph(
      starterGraph(),
      { name: 'Monolith' },
      http
    )
    expect(result.status).toBe('success')
    expect(result.output).toEqual([
      { name: 'Monolith', message: 'Hello from Monolith' }
    ])
    expect(result.steps.map(s => s.node_id)).toEqual([
      'start',
      'data',
      'result'
    ])
  })
  it.each(['high', 'low'])(
    'runs only the matching branch for %s',
    async priority => {
      const result = await executeGraph(
        templateGraph('branch'),
        { priority },
        http
      )
      expect(result.steps.map(s => s.node_id)).toEqual([
        'start',
        'data',
        priority === 'high' ? 'result' : 'other'
      ])
    }
  )
  it('clones messages before fan-out so one branch cannot mutate another', async () => {
    const graph = starterGraph()
    graph.nodes.push({
      id: 'untouched',
      kind: 'output',
      name: 'Other',
      x: 0,
      y: 0,
      config: {}
    })
    graph.edges.push({
      id: 'branch',
      source: 'start',
      target: 'untouched',
      port: 'main'
    })
    const input = { message: 'Original' },
      result = await executeGraph(graph, input, http)
    expect(result.output).toContainEqual({ message: 'Original' })
    expect(input.message).toBe('Original')
  })
  it('records a failed action and never executes its descendants', async () => {
    const result = await executeGraph(
      templateGraph('request'),
      {},
      async () => {
        throw Error('Unavailable')
      }
    )
    expect(result.status).toBe('error')
    expect(result.steps).toHaveLength(2)
    expect(result.steps[1]?.error).toBe('Unavailable')
  })
  it('aborts before any network action when cancelled', async () => {
    const signal = AbortSignal.abort()
    let calls = 0
    const result = await executeGraph(
      templateGraph('request'),
      {},
      async () => {
        calls++
        return {}
      },
      signal
    )
    expect(result.status).toBe('error')
    expect(calls).toBe(0)
  })
  it('rejects loops, invalid ports, missing nodes and duplicate wires', () => {
    const graph = starterGraph()
    expect(() =>
      validateGraph({
        ...graph,
        edges: [
          ...graph.edges,
          { id: 'bad', source: 'data', target: 'data', port: 'main' }
        ]
      })
    ).toThrow('Loops')
    expect(() =>
      validateGraph({
        ...graph,
        edges: [{ id: 'bad', source: 'start', target: 'missing', port: 'main' }]
      })
    ).toThrow('missing')
    expect(() =>
      validateGraph({
        ...graph,
        edges: [{ id: 'bad', source: 'start', target: 'data', port: 'true' }]
      })
    ).toThrow('port')
    expect(() =>
      validateGraph({
        ...graph,
        edges: [...graph.edges, { ...graph.edges[0], id: 'duplicate' }]
      })
    ).toThrow('Duplicate')
  })
  it('bounds exponential fan-out even in acyclic graphs', async () => {
    const graph: Graph = {
      version: 1,
      nodes: [
        { id: 'start', kind: 'trigger', name: 'Start', x: 0, y: 0, config: {} }
      ],
      edges: []
    }
    let previous = ['start']
    for (let i = 0; i < 12; i++) {
      const current = [`a${i}`, `b${i}`]
      for (const id of current) {
        graph.nodes.push({
          id,
          kind: 'set',
          name: id,
          x: 0,
          y: 0,
          config: { values: {} }
        })
        for (const source of previous)
          graph.edges.push({
            id: `${source}-${id}`,
            source,
            target: id,
            port: 'main'
          })
      }
      previous = current
    }
    const result = await executeGraph(graph, {}, http)
    expect(result.status).toBe('error')
    expect(result.steps.length).toBeLessThanOrEqual(201)
  })
})
describe('safe data and import boundaries', () => {
  it('preserves JSON value types and never evaluates expressions', () => {
    expect(interpolate('{{ count }}', { count: 3 })).toBe(3)
    expect(interpolate('Count {{ count }}', { count: 3 })).toBe('Count 3')
    expect(interpolate('{{ process.env.SECRET }}', {})).toBe(null)
  })
  it('blocks prototype reads and writes', () => {
    expect(() => writePath({}, '__proto__.polluted', true)).toThrow()
    expect(() => interpolate('{{ constructor.prototype }}', {})).toThrow()
    expect(Object.hasOwn({}, 'polluted')).toBe(false)
  })
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '100.64.0.1'
  ])('rejects private or reserved address %s', address =>
    expect(isPublicAddress(address)).toBe(false)
  )
  it('accepts public addresses', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true)
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true)
  })
  it('roundtrips the native format', () =>
    expect(
      importWorkflow(JSON.stringify({ title: 'Test', graph: starterGraph() }))
        .graph
    ).toEqual(starterGraph()))
  it('rejects unsupported upstream nodes rather than silently dropping them', () => {
    expect(() =>
      importWorkflow(
        JSON.stringify([{ id: '1', type: 'exec', command: 'echo x' }])
      )
    ).toThrow('Unsupported')
    expect(() =>
      importWorkflow(
        JSON.stringify({
          nodes: [{ name: 'Code', type: 'n8n-nodes-base.code' }],
          connections: {}
        })
      )
    ).toThrow('Unsupported')
  })
  it('imports Node-RED inject/change/debug wiring and literal fields', async () => {
    const imported = importWorkflow(
      JSON.stringify([
        { id: 'a', type: 'inject', wires: [['b']] },
        {
          id: 'b',
          type: 'change',
          rules: [{ t: 'set', p: 'payload', pt: 'msg', to: '42', tot: 'num' }],
          wires: [['c']]
        },
        { id: 'c', type: 'debug', wires: [] }
      ])
    )
    expect((await executeGraph(imported.graph, {}, http)).output).toEqual([
      { payload: 42 }
    ])
  })
})
