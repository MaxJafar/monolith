// SPDX-License-Identifier: 0BSD
import type { ModuleConfig } from '@monolith/configs'

export type ModuleImporter = () => Promise<{ default: ModuleConfig }>
type BundledModules = Readonly<Record<string, ModuleImporter>>
let installed: BundledModules | null = null

export function configureBundledModules(
  registry: Record<string, ModuleImporter>
): void {
  installed = Object.freeze(Object.fromEntries(Object.entries(registry)))
}
export function getBundledModules(): BundledModules | null {
  return installed
}
