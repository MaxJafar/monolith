// SPDX-License-Identifier: 0BSD
import { defineRelations } from 'drizzle-orm'

import type { ResolvedModuleSchema } from '@monolith/module-runtime/registry'

function collect<T>(
  target: Record<string, T>,
  source: Record<string, T>,
  kind: string
) {
  for (const [name, value] of Object.entries(source)) {
    if (Object.hasOwn(target, name) && target[name] !== value) {
      throw new Error('Conflicting ' + kind + ': ' + name)
    }
    target[name] = value
  }
}

export function composeRelations(parts: readonly ResolvedModuleSchema[]) {
  const tables: Record<string, any> = Object.create(null)
  for (const part of parts) collect(tables, part.tables, 'table registration')
  return defineRelations(tables, builder => {
    const relations: Record<string, any> = Object.create(null)
    for (const part of parts)
      collect(relations, part.relations(builder), 'relation registration')
    return relations
  })
}
