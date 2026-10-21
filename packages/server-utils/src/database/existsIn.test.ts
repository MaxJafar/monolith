// SPDX-License-Identifier: 0BSD
import { integer, pgTable, text } from 'drizzle-orm/pg-core'
import { expect, it } from 'vitest'
import { z } from 'zod'

import { EXISTS_IN, existsIn } from './existsIn'

const projects = pgTable('projects', {
  id: integer().primaryKey(),
  name: text()
})
it('preserves validation while keeping its reference annotation out of published JSON schema', () => {
  const schema = z.string().min(2)
  const before = schema.toJSONSchema()
  expect(existsIn(schema, projects, 'name')).toBe(schema)
  expect(schema.safeParse('x').success).toBe(false)
  expect(schema.toJSONSchema()).toEqual(before)
  const descriptor = Object.getOwnPropertyDescriptor(schema, EXISTS_IN)!
  expect(descriptor.enumerable).toBe(false)
  expect(Object.isFrozen(descriptor.value)).toBe(true)
  expect(descriptor.value).toEqual({ table: projects, column: 'name' })
})
it('supports rebinding an annotation without changing the shared symbol identity', () => {
  const schema = existsIn(z.number(), projects)
  existsIn(schema, projects, 'id')
  expect(EXISTS_IN).toBe(Symbol.for('monolith.existsIn'))
  expect(Object.getOwnPropertyDescriptor(schema, EXISTS_IN)?.value.column).toBe(
    'id'
  )
})
