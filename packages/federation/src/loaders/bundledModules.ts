import type { ModuleConfig } from '@monolith/configs'

type Registry = Record<string, () => Promise<{ default: ModuleConfig }>>
let modules: Registry | null = null
export function configureBundledModules(registry: Registry) {
  modules = Object.freeze({ ...registry })
}
export function getBundledModules() {
  return modules
}
