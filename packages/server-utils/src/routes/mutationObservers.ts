import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

type Observer = (context: {
  db: PostgresJsDatabase
  userId: string
  moduleId?: string
  phase?: 'before' | 'after'
  workspaceId?: string
}) => Promise<void>

// Modules and the host can be loaded from separate bundles. Keep one registry.
const registryKey = Symbol.for('monolith.mutationObservers')
const registry = globalThis as typeof globalThis & {
  [registryKey]?: Map<string, Observer>
}

export function registerMutationObserver(key: string, observer: Observer) {
  ;(registry[registryKey] ??= new Map()).set(key, observer)
}

export async function observeMutation(context: Parameters<Observer>[0]) {
  for (const observer of registry[registryKey]?.values() ?? [])
    await observer(context)
}
