// SPDX-License-Identifier: 0BSD
import {
  type RelationsBuilder,
  type RelationsBuilderConfig,
  getTableName
} from 'drizzle-orm'

import type { ResolvedModuleSchema } from '@monolith/module-runtime/registry'

/** Project only the helper namespaces; a table's column names stay untouched. */
function localBuilder<T extends object>(
  global: T,
  aliases: Record<string, string>
): T {
  const mapped = (value: object) =>
    new Proxy(value, {
      get(target, key) {
        const resolved =
          typeof key === 'string' && Object.hasOwn(aliases, key)
            ? aliases[key]
            : key
        return Reflect.get(target, resolved, target)
      }
    })
  const helpers = new Map<PropertyKey, unknown>()
  return new Proxy(global, {
    get(target, key) {
      if (key === 'one' || key === 'many') {
        if (!helpers.has(key))
          helpers.set(key, mapped(Reflect.get(target, key) as object))
        return helpers.get(key)
      }
      const resolved =
        typeof key === 'string' && Object.hasOwn(aliases, key)
          ? aliases[key]
          : key
      return Reflect.get(target, resolved, target)
    }
  })
}

export function defineModuleSchema<
  TTables extends Record<string, any>,
  TConfig extends RelationsBuilderConfig<TTables>
>(
  tables: TTables,
  relations: (builder: RelationsBuilder<TTables>) => TConfig,
  moduleId?: string
): ResolvedModuleSchema<
  TTables,
  (builder: RelationsBuilder<TTables>) => TConfig
> {
  if (!moduleId) return { tables, relations }
  const aliases: Record<string, string> = Object.create(null)
  const globalTables: Record<string, unknown> = Object.create(null)
  for (const [name, table] of Object.entries(tables)) {
    const physical = getTableName(table)
    if (
      Object.hasOwn(globalTables, physical) &&
      globalTables[physical] !== table
    ) {
      throw new Error('Duplicate database table: ' + physical)
    }
    aliases[name] = physical
    globalTables[physical] = table
  }
  const globalRelations = (builder: RelationsBuilder<TTables>): TConfig => {
    const local = relations(localBuilder(builder, aliases))
    return Object.fromEntries(
      Object.entries(local).map(([name, relation]) => [
        Object.hasOwn(aliases, name) ? aliases[name] : name,
        relation
      ])
    ) as TConfig
  }
  return {
    moduleId,
    tables: globalTables as TTables,
    relations: globalRelations,
    keyMap: aliases
  }
}
