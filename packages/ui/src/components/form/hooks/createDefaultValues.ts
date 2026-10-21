// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

/** Build an editable draft without running validation or output transforms. */
export function createDefaultValues<Schema extends z.ZodType>(
  schema: Schema
): z.infer<Schema> {
  const visiting = new Set<z.ZodType>()
  function draft(node: z.ZodType): unknown {
    if (visiting.has(node)) return undefined
    visiting.add(node)
    try {
      switch (node.def.type) {
        case 'string':
          return ''
        case 'number':
          return 0
        case 'boolean':
          return false
        case 'array':
          return []
        case 'nullable':
          return null
        case 'default':
          return (node as z.ZodDefault).def.defaultValue
        case 'enum':
          return (node as z.ZodEnum).options[0]
        case 'object':
          return Object.fromEntries(
            Object.entries((node as z.ZodObject).shape).map(([name, child]) => [
              name,
              draft(child)
            ])
          )
        case 'pipe':
          return draft((node as z.ZodPipe).in as z.ZodType)
        case 'readonly':
        case 'lazy':
          return draft(
            (node as z.ZodReadonly | z.ZodLazy).unwrap() as z.ZodType
          )
        default:
          return undefined
      }
    } finally {
      visiting.delete(node)
    }
  }
  return draft(schema) as z.infer<Schema>
}
