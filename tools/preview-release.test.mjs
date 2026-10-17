import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

import { validateInventory } from './preview-release.mjs'

test('preview publication rejects missing platforms, tampered downloads and unlisted assets', async t => {
  const parent = path.resolve('.temp')
  await fs.mkdir(parent, { recursive: true })
  const folder = await fs.mkdtemp(path.join(parent, 'preview-test-'))
  t.after(async () => {
    assert.equal(path.dirname(folder), parent)
    await fs.rm(folder, { recursive: true, force: true })
  })
  const files = []
  for (const target of [
    'windows-amd64',
    'darwin-universal',
    'linux-amd64',
    'linux-arm64',
    'server-kit',
    'agent-tools',
    'addons'
  ]) {
    const bytes = Buffer.from('test download ' + target),
      name = target + '.bin'
    await fs.writeFile(path.join(folder, name), bytes)
    files.push({
      name,
      target,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    })
  }
  const manifest = {
    format: 1,
    distribution: 'manual-preview',
    version: '0.1.0-preview.1',
    files
  }
  await validateInventory(folder, manifest)
  await assert.rejects(
    validateInventory(folder, { ...manifest, version: '0.1.0' }),
    /preview/
  )
  await assert.rejects(
    validateInventory(folder, { ...manifest, files: files.slice(1) }),
    /Missing/
  )
  await fs.writeFile(path.join(folder, 'unexpected.exe'), 'extra')
  await assert.rejects(validateInventory(folder, manifest), /Unlisted/)
  await fs.unlink(path.join(folder, 'unexpected.exe'))
  await fs.writeFile(path.join(folder, files[0].name), 'modified')
  await assert.rejects(
    validateInventory(folder, manifest),
    /verification failed/
  )
})
