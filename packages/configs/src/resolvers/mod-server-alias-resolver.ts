// SPDX-License-Identifier: 0BSD
import fs from 'node:fs'
import { builtinModules, createRequire } from 'node:module'
import path from 'node:path'
import type { Alias, Plugin } from 'vite'

import { findProjectRoot } from '../utils/projectRoot'

const requireFromConfig = createRequire(import.meta.url)
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, '')))
function manifestAt(filename: string):
  | {
      name?: string
      exports?: unknown
      dependencies?: object
      devDependencies?: object
    }
  | undefined {
  if (!fs.existsSync(filename)) return
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'))
  } catch {
    return
  }
}
function exportedPackage(filename: string, name: string): boolean {
  let folder = path.dirname(filename)
  for (;;) {
    const manifest = manifestAt(path.join(folder, 'package.json'))
    if (manifest?.name === name) return manifest.exports !== undefined
    const parent = path.dirname(folder)
    if (folder === parent) return false
    folder = parent
  }
}
function aliasMatches(alias: Alias, source: string): boolean {
  if (typeof alias.find === 'string')
    return source === alias.find || source.startsWith(alias.find + '/')
  alias.find.lastIndex = 0
  return alias.find.test(source)
}

function externalSpecifier(
  source: string,
  packageName: string,
  directory: string
): string {
  const split = source.search(/[?#]/)
  const plain = split < 0 ? source : source.slice(0, split)
  const suffix = split < 0 ? '' : source.slice(split)
  if (plain === packageName || builtins.has(plain)) return source
  try {
    const resolved = requireFromConfig
      .resolve(plain, { paths: [directory] })
      .replaceAll('\\', '/')
    if (exportedPackage(resolved, packageName)) return source
    const extension = path.extname(resolved)
    if (!extension || plain.endsWith(extension)) return source
    const leaf = resolved.slice(resolved.lastIndexOf('/') + 1)
    return (
      plain +
      (leaf === 'index' + extension && !plain.endsWith('/index')
        ? '/index'
        : '') +
      extension +
      suffix
    )
  } catch {
    return source
  }
}

export function serverAliasResolver(dirname: string): Plugin {
  const host = manifestAt(
    path.join(findProjectRoot(dirname), 'apps/api/package.json')
  )
  const shared = new Set([
    ...Object.keys(host?.dependencies ?? {}),
    ...Object.keys(host?.devDependencies ?? {})
  ])
  let aliases: Alias[] = []
  return {
    name: 'externalize-node-modules',
    enforce: 'pre',
    configResolved(config) {
      aliases = config.resolve.alias
    },
    resolveId(source) {
      if (source.startsWith('node:')) return { id: source, external: true }
      if (
        !source ||
        /^[./\\\0#]/.test(source) ||
        source.includes(':') ||
        source === '@' ||
        source.startsWith('@/')
      )
        return null
      if (aliases.some(alias => aliasMatches(alias, source))) return null
      const plain = source.split(/[?#]/)[0]!
      const pieces = plain.split('/')
      const packageName = plain.startsWith('@')
        ? pieces.slice(0, 2).join('/')
        : pieces[0]!
      if (!(
        packageName.startsWith('@monolith/') ||
        shared.has(packageName) ||
        builtins.has(packageName)
      ))
        return null
      return {
        id: externalSpecifier(source, packageName, dirname),
        external: true
      }
    }
  }
}
