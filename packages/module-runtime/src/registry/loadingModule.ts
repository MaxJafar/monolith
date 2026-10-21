// SPDX-License-Identifier: 0BSD
// Kept process-wide because an add-on and its host can resolve different bundles.
const key = Symbol.for('monolith.module-runtime.loading-module')
const context = globalThis as unknown as Record<symbol, unknown>

export function getLoadingModuleId(): string | undefined {
  const value = context[key]
  return typeof value === 'string' ? value : undefined
}

export function setLoadingModuleId(id: string | undefined): void {
  if (id !== undefined) context[key] = id
  else Reflect.deleteProperty(context, key)
}
