// SPDX-License-Identifier: 0BSD
import type { z } from 'zod'

import { EXISTS_IN, type ExistenceCheck } from './existsIn'

export type CollectedExistenceCheck = ExistenceCheck & {
  path: string
  values: unknown[]
}
type Frame = { schema: z.ZodType; value: unknown; path: string; parent?: Frame }
type Definition = Record<string, any>
const childPath = (parent: string, child: string) =>
  parent ? parent + '.' + child : child
function repeated(frame: Frame) {
  for (let prior = frame.parent; prior; prior = prior.parent)
    if (prior.schema === frame.schema && prior.value === frame.value)
      return true
  return false
}
function children(frame: Frame): Array<[z.ZodType, unknown, string]> {
  const { schema, value, path } = frame
  const def = schema._zod?.def as Definition | undefined
  if (!def) return []
  const sameValue = (child: z.ZodType): [z.ZodType, unknown, string] => [
    child,
    value,
    path
  ]
  const fields =
    value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null
  if (def.innerType) return [sameValue(def.innerType)]
  if (def.type === 'lazy') return [sameValue(def.getter())]
  if (def.type === 'pipe') return [sameValue(def.in)]
  if (def.type === 'intersection')
    return [sameValue(def.left), sameValue(def.right)]
  if (def.type === 'union')
    return def.options
      .filter((option: z.ZodType) => option.safeParse(value).success)
      .map(sameValue)
  if (def.type === 'array' && Array.isArray(value))
    return value.map((item, index) => [
      def.element,
      item,
      path + '[' + index + ']'
    ])
  if (def.type === 'record' && fields)
    return Object.entries(fields).map(([key, item]) => [
      def.valueType,
      item,
      childPath(path, key)
    ])
  if (def.type === 'object' && fields) {
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape
    return Object.entries(shape).map(([key, child]) => [
      child as z.ZodType,
      fields[key],
      childPath(path, key)
    ])
  }
  return []
}
export function collectExistenceChecks(
  schema: z.ZodType | undefined,
  value: unknown,
  path = ''
): CollectedExistenceCheck[] {
  const result: CollectedExistenceCheck[] = []
  const pending: Frame[] = schema ? [{ schema, value, path }] : []
  while (pending.length) {
    const frame = pending.pop()!
    if (frame.value === null || frame.value === undefined || repeated(frame))
      continue
    const annotation = (
      frame.schema as unknown as Record<symbol, ExistenceCheck>
    )[EXISTS_IN]
    if (annotation) {
      const values = (
        Array.isArray(frame.value) ? frame.value : [frame.value]
      ).filter(item => item !== null && item !== undefined)
      if (values.length)
        result.push({ ...annotation, path: frame.path || 'value', values })
      continue
    }
    const nested = children(frame)
    for (let index = nested.length - 1; index >= 0; index--) {
      const [schema, value, path] = nested[index]!
      pending.push({ schema, value, path, parent: frame })
    }
  }
  return result
}
