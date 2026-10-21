// SPDX-License-Identifier: 0BSD
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { commandTokens, runProcess } from './commands'
import { installFromGithub, managedPackagePath } from './installSource'

const fixture = vi.hoisted(() => ({ root: '', download: vi.fn() }))
vi.mock('./constants', () => ({
  get ROOT_DIR() {
    return fixture.root
  }
}))
vi.mock('./github/archive', () => ({
  downloadArchive: (...args: unknown[]) => fixture.download(...args)
}))
const entry = {
  id: 'tester--notes',
  repo: 'tester/notes',
  latest: '2.0.0',
  versions: { '2.0.0': 'a'.repeat(40) }
}
let target: string
beforeEach(() => {
  fixture.root = realpathSync(
    mkdtempSync(join(tmpdir(), 'monolith-source-install-'))
  )
  mkdirSync(join(fixture.root, 'modules'))
  target = join(fixture.root, 'modules', entry.id)
  mkdirSync(target)
  writeFileSync(join(target, 'saved.txt'), 'previous')
  fixture.download
    .mockReset()
    .mockImplementation(async (_repo, _commit, directory) => {
      mkdirSync(directory)
      writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({ name: '@monolith/tester--notes', version: '2.0.0' })
      )
      writeFileSync(join(directory, 'source.ts'), 'new source')
    })
})
afterEach(() => rmSync(fixture.root, { force: true, recursive: true }))
const install = (activate?: (directory: string) => Promise<void>) =>
  installFromGithub({
    kind: 'modules',
    id: entry.id,
    targetDir: target,
    version: entry.latest,
    entry,
    activate
  })

it('activates a pinned release and keeps the source', async () => {
  const activate = vi.fn(async (directory: string) => {
    expect(readFileSync(join(directory, 'source.ts'), 'utf8')).toBe(
      'new source'
    )
  })
  await expect(install(activate)).resolves.toMatchObject({
    commitSha: 'a'.repeat(40)
  })
  expect(activate).toHaveBeenCalledOnce()
  expect(readdirSync(join(fixture.root, 'modules'))).toEqual([entry.id])
})

it('restores the prior tree after an activation failure', async () => {
  await expect(
    install(async () => {
      throw Error('build failed')
    })
  ).rejects.toThrow('build failed')
  expect(readdirSync(target)).toEqual(['saved.txt'])
  expect(readFileSync(join(target, 'saved.txt'), 'utf8')).toBe('previous')
  expect(readdirSync(join(fixture.root, 'modules'))).toEqual([entry.id])
})

it('rejects a mismatched download without touching the installed package', async () => {
  fixture.download.mockImplementation(async (_repo, _commit, directory) => {
    mkdirSync(directory)
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({ name: '@monolith/other', version: '2.0.0' })
    )
  })
  await expect(install()).rejects.toThrow('identity/version')
  expect(readFileSync(join(target, 'saved.txt'), 'utf8')).toBe('previous')
})

it('does not permit traversal or linked package targets', () => {
  expect(() =>
    managedPackagePath('modules', join(fixture.root, '..', 'outside'))
  ).toThrow()
  const linked = join(fixture.root, 'modules', 'linked')
  symlinkSync(target, linked, 'junction')
  expect(() => managedPackagePath('modules', linked)).toThrow('filesystem link')
})

it('tokenizes argv without interpreting shell syntax or dropping empty arguments', () => {
  expect(commandTokens('git commit -m "two words" ""')).toEqual([
    'git',
    'commit',
    '-m',
    'two words',
    ''
  ])
  expect(commandTokens("git add 'a b.ts'")).toEqual(['git', 'add', 'a b.ts'])
  expect(() => commandTokens('git "unterminated')).toThrow('Unterminated')
  expect(() => commandTokens('"" arg')).toThrow('Invalid')
  expect(
    runProcess(process.execPath, [
      '-e',
      'process.stdout.write(process.argv[1])',
      '$(echo private)'
    ])
  ).toBe('$(echo private)')
})
