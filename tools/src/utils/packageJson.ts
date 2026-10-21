// SPDX-License-Identifier: 0BSD
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

import { objectFile, replaceJSON } from './jsonFile'

export type PackageJsonTarget = 'modules' | 'locales' | 'root'
interface PackageJson extends Record<string, unknown> {
  name?: string
  version?: string
  dependencies?: Record<string, string>
}
export function getPackageJsonPath(target: PackageJsonTarget) {
  return join(ROOT_DIR, ...(target === 'root' ? [] : [target]), 'package.json')
}
export function readPackageJson(target: PackageJsonTarget): PackageJson {
  const file = getPackageJsonPath(target)
  if (!existsSync(file) && target !== 'root') {
    mkdirSync(dirname(file), { recursive: true })
    replaceJSON(file, {
      name: '@monolith/' + target,
      private: true,
      description:
        target === 'modules' ? 'Monolith addons' : 'Monolith locale packages',
      dependencies: {}
    })
  }
  return objectFile(file) as PackageJson
}
export function writePackageJson(
  target: PackageJsonTarget,
  manifest: PackageJson
) {
  const file = getPackageJsonPath(target)
  if (target !== 'root') mkdirSync(dirname(file), { recursive: true })
  replaceJSON(file, manifest)
}
export function getDependencies(
  target: PackageJsonTarget = 'modules'
): Record<string, string> {
  const dependencies = readPackageJson(target).dependencies ?? {}
  if (
    !dependencies ||
    typeof dependencies !== 'object' ||
    Array.isArray(dependencies) ||
    Object.values(dependencies).some(value => typeof value !== 'string')
  )
    throw Error('Package dependencies must map names to versions')
  return dependencies
}
export function findPackageName(
  name: string,
  target: PackageJsonTarget = 'modules'
): string | null {
  return Object.hasOwn(getDependencies(target), name) ? name : null
}
export function hasDependency(
  name: string,
  target: PackageJsonTarget = 'modules'
) {
  return findPackageName(name, target) !== null
}
export function addDependency(
  name: string,
  target: PackageJsonTarget = 'modules',
  version = 'workspace:*'
) {
  const manifest = readPackageJson(target)
  writePackageJson(target, {
    ...manifest,
    dependencies: { ...getDependencies(target), [name]: version }
  })
}
export function removeDependency(
  name: string,
  target: PackageJsonTarget = 'modules'
) {
  const manifest = readPackageJson(target),
    dependencies = getDependencies(target)
  if (!Object.hasOwn(dependencies, name)) return
  const next = Object.fromEntries(
    Object.entries(dependencies).filter(([key]) => key !== name)
  )
  writePackageJson(target, { ...manifest, dependencies: next })
}
