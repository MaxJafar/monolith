// SPDX-License-Identifier: 0BSD
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import postgres from 'postgres'
import semver from 'semver'

import {
  coreAddonIds,
  modulePackageJSONSchema,
  retiredAddonIds
} from '@monolith/configs'

import bumpPackageVersion, {
  revertPackageVersion
} from '../utils/bumpPackageVersion'
import { installDeps, runProcess } from '../utils/commands'
import { ROOT_DIR } from '../utils/constants'
import {
  downloadArchive,
  getGithubLogin,
  getRepoSlug,
  getTagCommit,
  ghApi,
  updateRegistryIndex
} from '../utils/github'
import { installFromGithub, managedPackagePath } from '../utils/installSource'
import {
  type LockKind,
  getLocked,
  removeLocked,
  setLocked,
  verifyLocked
} from '../utils/moduleLock'
import normalizePackage from '../utils/normalizePackage'
import { addDependency, removeDependency } from '../utils/packageJson'
import { fetchRegistry, resolveEntry } from '../utils/registryIndex'
import { syncModuleSchema } from './db/functions/schema'

export function installed(kind: LockKind) {
  const root = join(ROOT_DIR, kind)
  return (existsSync(root) ? readdirSync(root, { withFileTypes: true }) : [])
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .flatMap(e => {
      const directory = join(root, e.name),
        file = join(directory, 'package.json')
      if (!existsSync(file)) return []
      const manifest = JSON.parse(readFileSync(file, 'utf8'))
      if (
        typeof manifest.name !== 'string' ||
        typeof manifest.version !== 'string'
      )
        throw Error('Invalid package ' + file)
      return [{ id: e.name, directory, manifest }]
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}
export function identity(kind: LockKind, name: string) {
  const alias =
    kind === 'locales' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(name)
      ? 'lang-' + name
      : name
  return normalizePackage(alias, kind === 'modules' ? 'module' : 'locale')
}
export function validatePackage(kind: LockKind, directory: string) {
  const manifest = JSON.parse(
    readFileSync(join(directory, 'package.json'), 'utf8')
  )
  if (!semver.valid(manifest.version) || typeof manifest.name !== 'string')
    throw Error('Package needs a name and semantic version')
  if (kind === 'modules') {
    modulePackageJSONSchema.parse(manifest)
    for (const file of [
      'client/manifest.ts',
      'client/vite.config.ts',
      'client/tsconfig.json'
    ])
      if (!existsSync(join(directory, file))) throw Error('Missing ' + file)
  }
  const locales = kind === 'modules' ? join(directory, 'locales') : directory
  const json = readdirSync(locales).filter(
    f => f.endsWith('.json') && f !== 'package.json'
  )
  if (!json.length) throw Error('No translation files found')
  for (const file of json) {
    const value = JSON.parse(readFileSync(join(locales, file), 'utf8'))
    if (!value || Array.isArray(value) || typeof value !== 'object')
      throw Error('Translation must be an object: ' + file)
  }
  return manifest
}
export function requirePublisher(directory: string) {
  const repo = getRepoSlug(directory),
    login = getGithubLogin()
  const permission = ghApi<{ permission: string }>(
    'repos/' +
      repo +
      '/collaborators/' +
      encodeURIComponent(login) +
      '/permission'
  ).permission
  if (!['admin', 'maintain', 'write'].includes(permission))
    throw Error('GitHub write permission is required for ' + repo)
}
export async function buildPackages(
  name?: string,
  options: {
    docker?: boolean
    buildClient?: boolean
    buildServer?: boolean
  } = {}
) {
  const requested = name ? identity('modules', name).fullName : undefined
  const rows = installed('modules').filter(
    row => !requested || row.manifest.name === requested
  )
  if (requested && !rows.length) throw Error('Addon is not installed')
  for (const row of rows)
    for (const part of ['client', 'server'] as const) {
      const script = row.manifest.scripts?.['build:' + part]
        ? 'build:' + part
        : part === 'client' && row.manifest.scripts?.build
          ? 'build'
          : null
      if (
        (part === 'client' ? options.buildClient : options.buildServer) ===
          false ||
        !script
      )
        continue
      runProcess('pnpm', ['run', script], {
        cwd: row.directory,
        stdio: 'inherit',
        env: options.docker ? { DOCKER_BUILD: 'true' } : undefined
      })
    }
}
export async function installPackage(
  kind: LockKind,
  name: string,
  upgrade = false,
  development = false
) {
  const target = identity(kind, name)
  if (kind === 'modules' && retiredAddonIds.has(target.shortName))
    throw Error('This addon is retired')
  if (existsSync(target.targetDir) !== upgrade)
    throw Error(
      upgrade ? 'Package is not installed' : 'Package is already installed'
    )
  const entry = await resolveEntry(kind, target.shortName)
  if (!entry) throw Error('Package is absent from the configured registry')
  if (kind === 'modules' && retiredAddonIds.has(entry.id))
    throw Error('This addon is retired')
  const current = upgrade
    ? JSON.parse(readFileSync(join(target.targetDir, 'package.json'), 'utf8'))
    : null
  if (current && semver.gte(current.version, entry.latest)) return
  const commit = entry.versions[entry.latest]
  if (!commit) throw Error('Registry release has no commit')
  verifyLocked(kind, entry.id, entry.latest, commit)
  const metadata = [
    join(ROOT_DIR, kind, 'package.json'),
    join(ROOT_DIR, 'modules-lock.json'),
    join(ROOT_DIR, 'pnpm-lock.yaml')
  ].map(file => ({ file, bytes: existsSync(file) ? readFileSync(file) : null }))
  try {
    await installFromGithub({
      kind,
      id: entry.id,
      entry,
      version: entry.latest,
      targetDir: target.targetDir,
      activate: async directory => {
        validatePackage(kind, directory)
        addDependency(target.fullName, kind)
        installDeps()
        if (kind === 'modules') {
          await buildPackages(target.fullName)
          if (process.env.DATABASE_URL || process.env.DATABASE_ADMIN_URL)
            await syncModuleSchema(directory)
        }
        setLocked(kind, entry.id, {
          version: entry.latest,
          repo: entry.repo,
          commitSha: commit
        })
      }
    })
  } catch (error) {
    for (const snapshot of metadata) {
      if (snapshot.bytes) writeFileSync(snapshot.file, snapshot.bytes)
      else rmSync(snapshot.file, { force: true })
    }
    throw error
  }
  // Source remains available for reproducible builds and license inspection in both modes.
  console.info(
    'Installed ' +
      target.fullName +
      ' ' +
      entry.latest +
      (development ? ' (development)' : '')
  )
}
export async function upgradePackages(kind: LockKind, name?: string) {
  const registry = await fetchRegistry(kind)
  const names = name
    ? [name]
    : installed(kind)
        .filter(
          row =>
            registry.some(entry => entry.id === row.id) &&
            !(coreAddonIds as readonly string[]).includes(row.id)
        )
        .map(row => row.manifest.name)
  for (const item of names) await installPackage(kind, item, true)
}
export async function ensureLocaleAvailableForUsers(id: string) {
  const url = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL
  if (!url)
    throw Error(
      'A database connection is required before removing a language pack'
    )
  const sql = postgres(url, { max: 1, connect_timeout: 5 })
  try {
    const rows =
      await sql`select 1 from users where language in (${id},${id.replace(/^lang-/, '')}) limit 1`
    if (rows.length) throw Error('This language is selected by an account')
  } finally {
    await sql.end()
  }
}
export async function removePackage(kind: LockKind, name: string) {
  const item = identity(kind, name),
    directory = managedPackagePath(kind, item.targetDir)
  if (
    kind === 'modules' &&
    (coreAddonIds as readonly string[]).includes(item.shortName)
  )
    throw Error('Core platform packages cannot be uninstalled')
  if (kind === 'locales') await ensureLocaleAvailableForUsers(item.shortName)
  if (!existsSync(directory)) throw Error('Package is not installed')
  const archive = join(ROOT_DIR, '.temp', 'removed-packages')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(archive, { recursive: true })
  const holder = mkdtempSync(join(archive, 'retired-'))
  renameSync(directory, join(holder, item.shortName))
  removeDependency(item.fullName, kind)
  removeLocked(kind, item.shortName)
  installDeps()
  console.info('Removed ' + item.fullName + '; source recovery: ' + holder)
}
export async function publishPackage(kind: LockKind, name: string) {
  const item = identity(kind, name),
    directory = item.targetDir
  validatePackage(kind, directory)
  requirePublisher(directory)
  if (
    resolve(
      runProcess('git', ['rev-parse', '--show-toplevel'], { cwd: directory })
    ) !== resolve(directory)
  )
    throw Error('Publish requires a separate package Git repository')
  if (runProcess('git', ['status', '--porcelain'], { cwd: directory }))
    throw Error('Commit package changes before publishing')
  const repo = getRepoSlug(directory),
    { newVersion, oldVersion } = bumpPackageVersion(directory)
  let committed = false
  try {
    runProcess('git', ['add', 'package.json'], { cwd: directory })
    runProcess(
      'git',
      ['commit', '-m', 'Release ' + item.shortName + ' ' + newVersion],
      { cwd: directory }
    )
    committed = true
    runProcess('git', ['tag', 'v' + newVersion], { cwd: directory })
    runProcess(
      'git',
      ['push', '--atomic', 'origin', 'HEAD', 'refs/tags/v' + newVersion],
      { cwd: directory }
    )
    updateRegistryIndex(kind, {
      id: item.shortName,
      repo,
      version: newVersion,
      commitSha: getTagCommit(repo, 'v' + newVersion)
    })
  } catch (error) {
    if (!committed) revertPackageVersion(directory, oldVersion)
    throw error
  }
}
export async function viewPackage(name: string) {
  const item = identity('modules', name)
  const entry = await resolveEntry('modules', item.shortName)
  if (!entry) throw Error('Addon is absent from the registry')
  console.info(JSON.stringify(entry, null, 2))
}
export function fingerprintTree(directory: string) {
  const result: Record<string, string> = {}
  function visit(parent: string) {
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (
        ['node_modules', '.git', 'dist', 'dist-docker', 'tsbuild'].includes(
          entry.name
        ) ||
        entry.name.startsWith('.monolith-')
      )
        continue
      const file = join(parent, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (entry.isFile())
        result[relative(directory, file).split(sep).join('/')] = createHash(
          'sha256'
        )
          .update(readFileSync(file))
          .digest('hex')
    }
  }
  visit(directory)
  return result
}
export async function comparePackages(name?: string) {
  const entries = await fetchRegistry('modules')
  for (const row of installed('modules').filter(
    row => !name || row.manifest.name === identity('modules', name).fullName
  )) {
    const entry = entries.find(e => e.id === row.id)
    if (!entry) {
      console.info(row.id + ': unpublished')
      continue
    }
    const version = getLocked('modules', row.id)?.version ?? entry.latest,
      commit = entry.versions[version]
    if (!commit) throw Error('Missing comparison revision')
    const scratch = mkdtempSync(join(tmpdir(), 'monolith-compare-'))
    try {
      await downloadArchive(entry.repo, commit, scratch)
      const local = fingerprintTree(row.directory),
        remote = fingerprintTree(scratch)
      for (const file of [
        ...new Set([...Object.keys(local), ...Object.keys(remote)])
      ].sort())
        if (local[file] !== remote[file])
          console.info(
            row.id +
              ' ' +
              (!remote[file] ? 'added' : !local[file] ? 'removed' : 'changed') +
              ' ' +
              file
          )
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }
}
