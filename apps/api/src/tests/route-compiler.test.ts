import { Router } from 'express'
import { describe, expect, it, vi } from 'vitest'

import type { EndpointContract, RouterInput } from '@monolith/server-utils'

import { compileRoutes } from '../core/functions/routes/compileRoutes'

vi.mock('../core/functions/routes/executeEndpoint', () => ({
  registerController: vi.fn()
}))
vi.mock('../core/middlewares/rateLimitingMiddleware', () => ({
  disableRateLimitForRoute: vi.fn()
}))

function endpoint(modulePathAlias?: string): EndpointContract {
  return {
    __isEndpointContract: true,
    modulePathAlias,
    getValue: () => ({ method: 'get' })
  } as EndpointContract
}

describe('Monolith route compiler', () => {
  it('exposes stable aliases without moving core or sibling module endpoints', () => {
    const tree = {
      health: endpoint(),
      modules: {
        one: { list: endpoint('tasks'), entries: { get: endpoint('tasks') } },
        two: { list: endpoint() }
      }
    }
    expect(compileRoutes(tree).map(item => item.path)).toEqual([
      '/health',
      '/modules/one/list',
      '/tasks/list',
      '/modules/one/entries/get',
      '/tasks/entries/get',
      '/modules/two/list'
    ])
  })

  it('normalizes package separators and keeps mounted Express routers', () => {
    const router = Router()
    expect(compileRoutes({ monolith$agents: { events: router } })).toEqual([
      { path: '/monolith--agents/events', target: router }
    ])
  })

  it('rejects conflicting aliases before mounting any routes', () => {
    expect(() =>
      compileRoutes({
        a: { list: endpoint('shared') },
        b: { list: endpoint('shared') },
        core: endpoint()
      })
    ).toThrow('Conflicting route')
  })

  it('rejects cycles but permits reused subtrees', () => {
    const cycle: RouterInput = {}
    cycle.self = cycle
    expect(() => compileRoutes(cycle)).toThrow('cycle')
    const shared = { list: endpoint() }
    expect(compileRoutes({ first: shared, second: shared })).toHaveLength(2)
  })
})
