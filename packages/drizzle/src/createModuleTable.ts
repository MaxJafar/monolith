// SPDX-License-Identifier: 0BSD
import { pgTableCreator } from 'drizzle-orm/pg-core'

import {
  deriveModuleNamespace,
  resolveCallerModuleId
} from '@monolith/module-runtime/registry'

export function createModuleTable(prefix?: string) {
  const owner = prefix === undefined ? resolveCallerModuleId() : undefined
  if (prefix === undefined && !owner) {
    throw new Error(
      'createModuleTable requires a registered caller or an explicit prefix'
    )
  }
  const namespace =
    prefix === undefined
      ? deriveModuleNamespace(owner!)
      : prefix.replaceAll('-', '_')
  if (!/^[A-Za-z_][A-Za-z\d_]*$/.test(namespace))
    throw new Error('Invalid module table namespace')
  return pgTableCreator(name => namespace + '__' + name)
}
