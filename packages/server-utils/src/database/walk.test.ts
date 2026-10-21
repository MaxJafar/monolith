// SPDX-License-Identifier: 0BSD
import { integer, pgTable, text } from 'drizzle-orm/pg-core'
import { expect, it } from 'vitest'
import { z } from 'zod'

import { existsIn } from './existsIn'
import { collectExistenceChecks } from './walk'

const projects = pgTable('projects', {
  id: integer().primaryKey(),
  name: text()
})
const id = () => existsIn(z.number(), projects)

it('finds references in nested lists and records with precise field paths', () => {
  const schema = z.object({
    rows: z.array(z.object({ project: id() })),
    labels: z.record(z.string(), existsIn(z.string(), projects, 'name'))
  })
  const checks = collectExistenceChecks(
    schema,
    { rows: [{ project: 3 }, { project: 4 }], labels: { work: 'Launch' } },
    'body'
  )
  expect(
    checks.map(({ path, values, column }) => ({ path, values, column }))
  ).toEqual([
    { path: 'body.rows[0].project', values: [3], column: undefined },
    { path: 'body.rows[1].project', values: [4], column: undefined },
    { path: 'body.labels.work', values: ['Launch'], column: 'name' }
  ])
})
it('skips missing, null and sentinel references without losing optional inner annotations', () => {
  const schema = z.object({
    project: id().nullable().optional(),
    other: z.union([id(), z.literal('')])
  })
  expect(collectExistenceChecks(schema, { project: null, other: '' })).toEqual(
    []
  )
  expect(collectExistenceChecks(schema, { other: '' })).toEqual([])
  expect(
    collectExistenceChecks(schema, { project: 8, other: '' })[0]?.values
  ).toEqual([8])
  expect(
    collectExistenceChecks(existsIn(z.array(z.number()), projects), [])
  ).toEqual([])
})
it('uses the selected union branch and includes both halves of an intersection', () => {
  const choice = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('reference'), value: id() }),
    z.object({ kind: z.literal('text'), value: z.string() })
  ])
  expect(
    collectExistenceChecks(choice, { kind: 'text', value: 'unbound' })
  ).toEqual([])
  const schema = z.intersection(
    z.object({ item: choice }),
    z.object({ owner: id() })
  )
  expect(
    collectExistenceChecks(schema, {
      item: { kind: 'reference', value: 1 },
      owner: 2
    }).map(x => x.path)
  ).toEqual(['item.value', 'owner'])
})
it('walks lazy and transformed schemas and terminates cyclic input', () => {
  const node: z.ZodType = z.lazy(() =>
    z.object({ project: id(), child: node.optional() })
  )
  const value: any = { project: 5 }
  value.child = value
  expect(collectExistenceChecks(node, value).map(x => x.values)).toEqual([[5]])
  expect(
    collectExistenceChecks(
      id().transform(value => value),
      9
    )[0]?.values
  ).toEqual([9])
  const self: z.ZodType = z.lazy(() => self)
  expect(collectExistenceChecks(self, 1)).toEqual([])
})
it('collects shared schema instances at every path without recursive call-stack limits', () => {
  const shared = id()
  expect(
    collectExistenceChecks(z.object({ a: shared, b: shared }), {
      a: 1,
      b: 1
    }).map(x => x.path)
  ).toEqual(['a', 'b'])
  let schema: z.ZodType = id()
  for (let index = 0; index < 2000; index++) schema = schema.optional()
  expect(collectExistenceChecks(schema, 2)[0]?.values).toEqual([2])
})
