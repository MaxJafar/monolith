// SPDX-License-Identifier: 0BSD
import { integer, pgTable } from 'drizzle-orm/pg-core'
import { expect, it, vi } from 'vitest'
import { z } from 'zod'

import { composeRelations } from '@monolith/drizzle'
import {
  ModuleRegistry,
  getLoadingModuleId,
  setLoadingModuleId
} from '@monolith/module-runtime/registry'

import type { RequestContext } from '../typescript/core/endpoint_contract.types'
import { defineEndpoints } from './contracts'
import defineRoutes from './defineRoutes'

it('binds typed input, core ownership and response helpers to a query callback', async () => {
  const api = defineEndpoints({
    moduleId: 'calendar',
    modulePathAlias: '@calendar'
  })
  const contract = api
    .query({
      description: 'Find project',
      input: { query: z.object({ id: z.number() }) },
      output: { OK: z.object({ id: z.number() }) }
    })
    .callback(async ({ query, response }) => response.ok({ id: query.id }))
  const result = contract.getValue()
  expect(result).toMatchObject({
    method: 'get',
    callerModule: { source: 'core', id: 'calendar' },
    noAuth: false,
    encrypted: true,
    rateLimit: true
  })
  expect(contract.modulePathAlias).toBe('@calendar')
  expect(await result.callback({ query: { id: 7 } } as RequestContext)).toEqual(
    { $status: 200, payload: { id: 7 } }
  )
})
it('copies middleware/schema containers so catalog consumers cannot corrupt a contract', () => {
  const middleware = vi.fn()
  const source = [middleware]
  const contract = defineEndpoints()
    .mutation({
      description: 'Save',
      input: { body: z.object({ title: z.string() }) },
      output: { NO_CONTENT: true },
      middlewares: source,
      rateLimit: false,
      encrypted: false,
      noAuth: true
    })
    .callback(async ({ response }) => response.noContent())
  source.length = 0
  const first = contract.getValue()
  first.middlewares.length = 0
  first.schema.body = undefined
  expect(contract.getValue().middlewares).toEqual([middleware])
  expect(contract.getValue().schema.body).toBeDefined()
  expect(contract.getValue()).toMatchObject({
    method: 'post',
    encrypted: false,
    rateLimit: false,
    noAuth: true
  })
})
it('keeps module schemas and exact route keys available to consumers', () => {
  const projects = pgTable('project_fixture', { id: integer().primaryKey() })
  const api = defineEndpoints({
    schema: { tables: { projects }, relations: () => ({}) }
  })
  const query = z.number()
  expect(api.existsIn(query, projects)).toBe(query)
  const endpoint = api
    .query({ description: 'Accepted', output: { ACCEPTED: true } })
    .callback(async ({ response }) => response.accepted())
  const tree = { nested: { endpoint } }
  expect(defineRoutes(tree)).toBe(tree)
})

it('reuses another addon endpoint schema without registering bundled table copies', () => {
  const previous = getLoadingModuleId()
  const owner = 'monolith--database-fixture'
  const consumer = 'monolith--drawing-fixture'
  const fixture = () => ({
    tables: {
      workspaces: pgTable('shared_workspaces', { id: integer().primaryKey() })
    },
    relations: () => ({})
  })
  try {
    setLoadingModuleId(owner)
    defineEndpoints({ schema: fixture(), schemaOwnerId: owner })
    setLoadingModuleId(consumer)
    const api = defineEndpoints({ schema: fixture(), schemaOwnerId: owner })
    const route = api
      .query({ description: 'Shared workspace', output: { NO_CONTENT: true } })
      .callback(async ({ response }) => response.noContent())
    const parts = ModuleRegistry.schemaParts.filter(part =>
      [owner, consumer].includes(part.moduleId ?? '')
    )
    expect(parts).toHaveLength(2)
    expect(
      Object.keys(parts.find(part => part.moduleId === consumer)!.tables)
    ).toEqual([])
    expect(ModuleRegistry.getModuleKeyMap(consumer)).toEqual({
      workspaces: 'shared_workspaces'
    })
    expect(Object.keys(composeRelations(parts))).toEqual(['shared_workspaces'])
    expect(route.getValue().callerModule).toEqual({
      source: 'app',
      id: consumer
    })
  } finally {
    ModuleRegistry.unregisterSchemaPart(owner)
    ModuleRegistry.unregisterSchemaPart(consumer)
    setLoadingModuleId(previous)
  }
})
