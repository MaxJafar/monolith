import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

import { prepare, validateInventory } from './preview-release.mjs'

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

for (const automatic of [false, true])
  test(`complete ${automatic ? 'signed release' : 'preview'} verifies catalogs and module inventory`, async t => {
    const parent = path.resolve('.temp')
    await fs.mkdir(parent, { recursive: true })
    const root = await fs.mkdtemp(path.join(parent, 'preview-catalog-test-'))
    t.after(async () => {
      assert.equal(path.dirname(root), parent)
      await fs.rm(root, { recursive: true, force: true })
    })
    const version = automatic ? '0.1.0' : '0.1.0-preview.1'
    const inventoryName = automatic
      ? 'release-downloads.json'
      : 'manual-release.json'
    const folder = path.join(root, 'dist/platform-releases', 'v' + version)
    await fs.mkdir(folder, { recursive: true })
    await fs.mkdir(path.join(root, 'modules/monolith--atlas'), {
      recursive: true
    })
    await fs.mkdir(path.join(root, 'modules/monolith--calendar'))
    await fs.writeFile(path.join(root, 'modules/.gitkeep'), '')
    await fs.writeFile(
      path.join(root, 'modules/README.md'),
      'Module documentation'
    )
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ version })
    )
    const asset = async (name, text) => {
      const bytes = Buffer.from(text)
      await fs.writeFile(path.join(folder, name), bytes)
      return {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')
      }
    }
    for (const target of ['linux-amd64', 'linux-arm64']) {
      const name = 'monolith-' + version + '-' + target + '.tar.gz'
      const metadata = await asset(name, 'server fixture ' + target)
      await fs.writeFile(
        path.join(folder, target + '.artifact.json'),
        JSON.stringify({
          target,
          url:
            'https://github.com/MaxJafar/monolith/releases/download/v' +
            version +
            '/' +
            name,
          ...metadata
        })
      )
    }
    for (const name of [
      'monolith-' + version + '-windows-amd64.exe',
      'monolith-' + version + '-darwin-universal.dmg',
      'monolith-' + version + '-server-kit.zip',
      'monolith-agent-tools-' + version + '.tgz'
    ])
      await asset(name, 'package fixture ' + name)
    const addon = {
      id: 'monolith--atlas',
      version: '1.0.0',
      hostVersion: version,
      ...(await asset('monolith--atlas-1.0.0.monolith-addon', 'addon fixture'))
    }
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    await fs.mkdir(path.join(root, 'release/keys'), { recursive: true })
    const key = publicKey.export({ type: 'spki', format: 'pem' })
    await fs.writeFile(path.join(root, 'release/keys/addon-catalog.pem'), key)
    await fs.writeFile(path.join(root, 'release/keys/app-release.pem'), key)
    const payload = Buffer.from(
      JSON.stringify({ format: 1, releases: [addon] })
    )
    await fs.writeFile(
      path.join(folder, 'addon-catalog-public.pem'),
      publicKey.export({ type: 'spki', format: 'pem' })
    )
    await fs.writeFile(
      path.join(folder, 'addon-catalog.signed.json'),
      JSON.stringify({
        payload: payload.toString('base64'),
        signature: sign(null, payload, privateKey).toString('base64')
      })
    )
    if (automatic) {
      const artifacts = []
      for (const target of [
        'windows-amd64',
        'darwin-universal',
        'linux-amd64',
        'linux-arm64'
      ]) {
        if (target.startsWith('linux')) {
          artifacts.push(
            JSON.parse(
              await fs.readFile(
                path.join(folder, target + '.artifact.json'),
                'utf8'
              )
            )
          )
          await asset('monolith-updater-' + target, 'updater fixture ' + target)
        } else {
          const name = 'monolith-' + version + '-' + target + '.zip'
          artifacts.push({
            target,
            url:
              'https://github.com/MaxJafar/monolith/releases/download/v' +
              version +
              '/' +
              name,
            ...(await asset(name, 'update fixture ' + target))
          })
        }
      }
      const data = Buffer.from(
        JSON.stringify({
          format: 1,
          version,
          channel: 'stable',
          protocol: 1,
          artifacts
        })
      )
      await fs.writeFile(
        path.join(folder, 'monolith-release.json'),
        JSON.stringify({
          payload: data.toString('base64'),
          signature: sign(null, data, privateKey).toString('base64')
        })
      )
    }
    await prepare(root, 'manifest', undefined, { automatic })
    const manifest = JSON.parse(
      await fs.readFile(path.join(folder, inventoryName), 'utf8')
    )
    assert.equal(
      manifest.files.filter(file => file.target === 'addons').length,
      1
    )
    assert.match(
      await fs.readFile(path.join(folder, 'SHA256SUMS'), 'utf8'),
      new RegExp(inventoryName.replace('.', '\\.'))
    )
    if (automatic) {
      await validateInventory(folder, manifest, key)
      await assert.rejects(
        validateInventory(folder, manifest),
        /pinned release public key/
      )
      const other = generateKeyPairSync('ed25519').publicKey
      await assert.rejects(
        validateInventory(folder, manifest, other),
        /Invalid main release signature/
      )
      const altered = structuredClone(manifest)
      const archive = altered.files.find(file =>
        file.name.endsWith('windows-amd64.zip')
      )
      Object.assign(
        archive,
        await asset(
          archive.name,
          'replacement archive with revised unsigned checksums'
        )
      )
      await assert.rejects(
        validateInventory(folder, altered, key),
        /Signed update archive does not match/
      )
    }
    await fs.mkdir(path.join(root, 'modules/monolith--missing'))
    await assert.rejects(
      prepare(root, 'manifest', undefined, { automatic }),
      /Every optional addon/
    )
  })
