import { Router } from 'express'
import { describe, expect, it } from 'vitest'

import traceRouteStack, { type RouteStackLayer } from './traceRouteStack'

describe('endpoint catalog discovery', () => {
  it('discovers each method, nested mount and metadata without invoking handlers', () => {
    const child = Router()
    const handler = Object.assign(
      () => {
        throw new Error('Do not execute')
      },
      {
        meta: { description: 'List records', noAuth: false }
      }
    )
    child.route('/records').get(handler).post(handler)
    const root = Router()
    root.use('/workspace', child)
    root.get('/health', handler)
    expect(
      traceRouteStack(root.stack).map(({ method, path, description }) => ({
        method,
        path,
        description
      }))
    ).toEqual([
      {
        method: 'GET',
        path: '/workspace/records',
        description: 'List records'
      },
      {
        method: 'POST',
        path: '/workspace/records',
        description: 'List records'
      },
      { method: 'GET', path: '/health', description: 'List records' }
    ])
  })

  it('preserves repeated mounts and terminates cyclic stacks', () => {
    const child: RouteStackLayer[] = [
      { route: { path: '/item', methods: { get: true } } }
    ]
    child.push({ handle: { stack: child } })
    const result = traceRouteStack([
      { monolithMountPath: '/one', handle: { stack: child } },
      { monolithMountPath: '/two', handle: { stack: child } }
    ])
    expect(result.map(route => route.path)).toEqual(['/one/item', '/two/item'])
  })
})
