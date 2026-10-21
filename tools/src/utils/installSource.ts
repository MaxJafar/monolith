// SPDX-License-Identifier: 0BSD
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync
} from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

import { addonPackageName } from '@monolith/configs'

import { ROOT_DIR } from './constants'
import { downloadArchive } from './github/archive'
import type { LockKind } from './moduleLock'
import type { RegistryEntry } from './registryIndex'

export function managedPackagePath(kind: LockKind, destination: string) {
  const root = resolve(ROOT_DIR, kind),
    target = resolve(destination)
  if (!target.startsWith(root + sep) || dirname(target) !== root)
    throw Error('Package path must be a direct workspace child')
  if (realpathSync(root) !== join(realpathSync(ROOT_DIR), kind))
    throw Error('Package root must not be a filesystem link')
  if (existsSync(target) && lstatSync(target).isSymbolicLink())
    throw Error('Package path must not be a filesystem link')
  return target
}
export async function installFromGithub(options: {
  kind: LockKind
  id: string
  entry: RegistryEntry
  targetDir: string
  version: string
  activate?: (directory: string) => Promise<void>
}): Promise<{ commitSha: string; name: string }> {
  const { kind, id, entry, version } = options
  const target = managedPackagePath(kind, options.targetDir),
    commitSha = entry.versions[version]
  if (!commitSha) throw Error('Release does not have a pinned commit')
  const scratch = mkdtempSync(join(dirname(target), '.monolith-install-')),
    incoming = join(scratch, 'incoming'),
    previous = join(scratch, 'previous')
  let active = false,
    backedUp = false,
    preserveRecovery = false
  try {
    await downloadArchive(entry.repo, commitSha, incoming)
    const manifest = JSON.parse(
      readFileSync(join(incoming, 'package.json'), 'utf8')
    )
    const expected = addonPackageName('@monolith/' + id)
    if (manifest.name !== expected || manifest.version !== version)
      throw Error(
        'Downloaded package identity/version does not match the release'
      )
    if (existsSync(target)) {
      renameSync(target, previous)
      backedUp = true
    }
    renameSync(incoming, target)
    active = true
    await options.activate?.(target)
    return { commitSha, name: manifest.name }
  } catch (error) {
    try {
      if (active) rmSync(target, { recursive: true, force: true })
      if (backedUp) renameSync(previous, target)
    } catch (recoveryError) {
      preserveRecovery = true
      throw new AggregateError(
        [error, recoveryError],
        'Activation and recovery failed; preserved source at ' + scratch
      )
    }
    throw error
  } finally {
    if (!preserveRecovery) rmSync(scratch, { recursive: true, force: true })
  }
}
