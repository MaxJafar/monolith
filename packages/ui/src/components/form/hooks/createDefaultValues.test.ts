// SPDX-License-Identifier: 0BSD
import { expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createDefaultValues } from './createDefaultValues'

it('prepares nested editable values without executing output transforms', () => {
  const transform = vi.fn((value: string) => value.length)
  const shape = z.object({
    title: z.string().min(1),
    amount: z.number().positive(),
    active: z.boolean(),
    labels: z.array(z.string()),
    status: z.enum(['planned', 'done']),
    extra: z.string().optional(),
    empty: z.string().nullable(),
    date: z.date(),
    nested: z.object({ text: z.string().transform(transform) }).readonly()
  })
  expect(createDefaultValues(shape)).toEqual({
    title: '',
    amount: 0,
    active: false,
    labels: [],
    status: 'planned',
    extra: undefined,
    empty: null,
    date: undefined,
    nested: { text: '' }
  })
  expect(transform).not.toHaveBeenCalled()
})
it('evaluates explicit defaults separately for each draft', () => {
  const schema = z.object({
    selected: z.array(z.string()).default(() => ['home'])
  })
  const first = createDefaultValues(schema)
  first.selected.push('changed')
  expect(createDefaultValues(schema)).toEqual({ selected: ['home'] })
})
it('terminates recursive schemas and resolves repeated nonrecursive fields', () => {
  const recursive: z.ZodType = z.lazy(() => z.object({ self: recursive }))
  expect(createDefaultValues(recursive)).toEqual({ self: undefined })
  const child = z.object({ title: z.string() })
  expect(createDefaultValues(z.object({ left: child, right: child }))).toEqual({
    left: { title: '' },
    right: { title: '' }
  })
})
it('retains optional and nullable choices instead of introducing a default', () => {
  expect(
    createDefaultValues(z.string().default('text').optional())
  ).toBeUndefined()
  expect(createDefaultValues(z.string().default('text').nullable())).toBeNull()
  expect(createDefaultValues(z.lazy(() => z.number().default(25)))).toBe(25)
})
