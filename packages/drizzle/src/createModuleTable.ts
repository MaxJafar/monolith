import { pgTableCreator } from 'drizzle-orm/pg-core'

import {
  deriveModuleNamespace,
  resolveCallerModuleId
} from '@monolith/module-runtime/registry'

export function createModuleTable(prefix?: string) {
  let namespace: string
  if (prefix === undefined) {
    const owner = resolveCallerModuleId()
    if (!owner)
      throw new Error(
        'createModuleTable: could not resolve the caller module id; pass a prefix explicitly'
      )
    namespace = deriveModuleNamespace(owner)
  } else namespace = prefix.replaceAll('-', '_')
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(namespace))
    throw new Error('Invalid module table namespace')
  return pgTableCreator(table => [namespace, table].join('__'))
}
