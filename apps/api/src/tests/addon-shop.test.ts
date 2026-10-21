import { generateKeyPairSync, sign } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AddonRelease, compareReleaseVersions } from '@monolith/configs'

import {
  digest,
  safePackagePath,
  unpackAddon
} from '../lib/modules/shop/archive'
import { checkReleaseUrl, downloadRelease } from '../lib/modules/shop/download'
import { AddonShop } from '../lib/modules/shop/service'

const directories: string[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    directories
      .splice(0)
      .map(directory => fs.rm(directory, { recursive: true, force: true }))
  )
})
function fixture(
  version = '1.1.0',
  extra: { path: string; data: string }[] = []
) {
  const pkg = {
    name: '@monolith/sample',
    monolith: { id: 'monolith--sample' },
    type: 'module',
    version
  }
  const files = Object.entries({
    'package.json': JSON.stringify(pkg),
    'client/dist/monolith-manifest.json': JSON.stringify({
      package: pkg,
      hasServer: false
    }),
    'client/dist/remoteEntry.js': 'export const working = true'
  }).map(([path, value]) => ({
    path,
    data: Buffer.from(value).toString('base64')
  }))
  const bytes = gzipSync(
    JSON.stringify({
      format: 1,
      id: 'monolith--sample',
      version,
      hostVersion: '1.0.0',
      files: [...files, ...extra]
    })
  )
  const release: AddonRelease = {
    id: 'monolith--sample',
    name: 'Sample',
    description: 'Test',
    icon: 'lucide:box',
    category: 'Tools',
    kind: 'addon',
    version,
    hostVersion: '1.0.0',
    url: 'https://github.com/example/repo/releases/download/v1/sample.monolith-addon',
    sha256: digest(bytes),
    bytes: bytes.length,
    schemaHash: null,
    notes: '',
    widgets: []
  }
  return { bytes, release }
}
async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'monolith-shop-'))
  directories.push(root)
  const catalogFile = path.join(root, 'catalog.json'),
    { bytes, release } = fixture()
  await fs.writeFile(
    catalogFile,
    JSON.stringify({ format: 1, releases: [release] })
  )
  return { root, catalogFile, bytes, release }
}
async function finished(shop: AddonShop) {
  await vi.waitFor(async () =>
    expect(['complete', 'failed']).toContain(
      (await shop.snapshot()).jobs[0]?.phase
    )
  )
  return (await shop.snapshot()).jobs[0]!
}

describe('verified addon packages', () => {
  it('unpacks a complete package only after hashing it', () => {
    const { bytes, release } = fixture()
    expect(unpackAddon(bytes, release)).toHaveLength(3)
    expect(() =>
      unpackAddon(Buffer.concat([bytes, Buffer.from('bad')]), release)
    ).toThrow('integrity')
  })
  it('preserves the license notices emitted by the release packager', () => {
    const notice = {
      path: 'NOTICE.md',
      data: Buffer.from('Third-party license notice').toString('base64')
    }
    const { bytes, release } = fixture('1.1.0', [notice])
    expect(unpackAddon(bytes, release)).toContainEqual({
      path: notice.path,
      data: Buffer.from('Third-party license notice')
    })
  })
  it.each([
    '../env/.env',
    '/package.json',
    'server/dist/../../escape.js',
    'client/dist/CON.js',
    'client/dist/a\\b.js',
    'client/dist/.env',
    'client/dist/secrets.key',
    'NOTICE.md/../../escape.js',
    'NOTICE.js'
  ])('rejects unsafe path %s', name =>
    expect(safePackagePath(name)).toBe(false)
  )
  it('rejects duplicate paths on case insensitive filesystems', () => {
    const { bytes, release } = fixture('1.1.0', [
      { path: 'CLIENT/dist/remoteEntry.js', data: 'YQ==' }
    ])
    expect(() => unpackAddon(bytes, release)).toThrow()
  })
  it('compares numeric and prerelease versions without offering downgrades', () => {
    expect(compareReleaseVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareReleaseVersions('1.0.0-rc.2', '1.0.0-rc.10')).toBeLessThan(0)
    expect(compareReleaseVersions('1.0.0', '1.0.0-rc.9')).toBeGreaterThan(0)
  })
  it('allows only release hosts, including after redirects', async () => {
    expect(() => checkReleaseUrl('http://localhost/file')).toThrow()
    expect(() => checkReleaseUrl('https://github.com.evil.test/file')).toThrow()
    expect(() =>
      checkReleaseUrl('https://user:secret@github.com/file')
    ).toThrow()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: 'http://127.0.0.1/private' }
          })
      )
    )
    await expect(
      downloadRelease('https://github.com/example/file', 100)
    ).rejects.toThrow('HTTPS')
  })
  it('reports actual received bytes and bounds streamed downloads', async () => {
    const progress: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array([1, 2]))
                controller.enqueue(new Uint8Array([3]))
                controller.close()
              }
            })
          )
      )
    )
    expect(
      await downloadRelease('https://github.com/file', 3, value =>
        progress.push(value)
      )
    ).toEqual(Buffer.from([1, 2, 3]))
    expect(progress).toEqual([2, 3])
    await expect(downloadRelease('https://github.com/file', 2)).rejects.toThrow(
      'size'
    )
  })
})

describe('addon activation and recovery', () => {
  it('recovers an interrupted activation before loading any candidate code', async () => {
    const data = await setup(),
      directory = path.join(data.root, 'storage/addons')
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(
      path.join(directory, 'installed.json'),
      JSON.stringify({
        'monolith--sample': {
          slot: '1.1.0-bbbbbbbbbbbb',
          version: '1.1.0',
          previous: '1.0.0-aaaaaaaaaaaa',
          previousVersion: '1.0.0',
          pending: true
        }
      })
    )
    const shop = new AddonShop({ ...data, hostVersion: '1.0.0' })
    expect((await shop.directories())['monolith--sample']).toBe(
      path.join(directory, 'packages/monolith--sample/1.0.0-aaaaaaaaaaaa')
    )
    expect(
      JSON.parse(
        await fs.readFile(path.join(directory, 'installed.json'), 'utf8')
      )['monolith--sample'].pending
    ).toBeUndefined()
  })
  it('rejects corrupt saved state without resolving paths', async () => {
    const data = await setup(),
      directory = path.join(data.root, 'storage/addons')
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(
      path.join(directory, 'installed.json'),
      JSON.stringify({
        'monolith--sample': { slot: '../escape', version: '1.0.0' }
      })
    )
    await expect(
      new AddonShop({ ...data, hostVersion: '1.0.0' }).directories()
    ).rejects.toThrow('Invalid installed')
  })
  it('writes an immutable package and restores it after a host restart', async () => {
    const data = await setup()
    let installed: { id: string; version: string; directory: string }[] = []
    const shop = new AddonShop({
      ...data,
      hostVersion: '1.0.0',
      download: async (_url, _size, progress) => {
        progress?.(data.bytes.length)
        return data.bytes
      },
      installed: () => installed
    })
    shop.setReload(async () => {
      const directories = await shop.directories()
      installed = Object.entries(directories).map(([id, directory]) => ({
        id,
        directory,
        version: data.release.version
      }))
    })
    await shop.start(data.release.id)
    expect((await finished(shop)).phase).toBe('complete')
    const restart = new AddonShop({ ...data, hostVersion: '1.0.0' })
    expect(await restart.directories()).toEqual(await shop.directories())
    expect(
      await fs.readFile(
        path.join(installed[0]!.directory, 'client/dist/remoteEntry.js'),
        'utf8'
      )
    ).toContain('working')
    await expect(shop.start(data.release.id)).rejects.toThrow(
      'already installed'
    )
  })
  it('restores the previous pointer when loading the new code fails', async () => {
    const data = await setup()
    let calls = 0
    const shop = new AddonShop({
      ...data,
      hostVersion: '1.0.0',
      download: async () => data.bytes,
      installed: () => []
    })
    shop.setReload(async () => {
      calls++
      if (calls === 1) throw Error('broken import')
    })
    await shop.start(data.release.id)
    expect((await finished(shop)).phase).toBe('failed')
    expect(calls).toBe(2)
    expect(await shop.directories()).toEqual({})
  })
  it('leaves existing source files and data untouched on checksum failure', async () => {
    const data = await setup()
    const marker = path.join(data.root, 'data.txt')
    await fs.writeFile(marker, 'user data')
    const shop = new AddonShop({
      ...data,
      hostVersion: '1.0.0',
      download: async () => Buffer.from('corrupt'),
      installed: () => []
    })
    const reload = vi.fn(async () => {})
    shop.setReload(reload)
    await shop.start(data.release.id)
    expect((await finished(shop)).phase).toBe('failed')
    expect(reload).not.toHaveBeenCalled()
    expect(await fs.readFile(marker, 'utf8')).toBe('user data')
    expect(await shop.directories()).toEqual({})
  })
  it('rejects incompatible hosts, schema changes and simultaneous operations', async () => {
    const data = await setup()
    const incompatible = new AddonShop({ ...data, hostVersion: '2.0.0' })
    incompatible.setReload(async () => {})
    await expect(incompatible.start(data.release.id)).rejects.toThrow(
      'Update Monolith'
    )
    await fs.writeFile(
      data.catalogFile,
      JSON.stringify({
        format: 1,
        releases: [{ ...data.release, schemaHash: 'a'.repeat(64) }]
      })
    )
    const migration = new AddonShop({ ...data, hostVersion: '1.0.0' })
    migration.setReload(async () => {})
    await expect(migration.start(data.release.id)).rejects.toThrow('migration')
    await fs.writeFile(
      data.catalogFile,
      JSON.stringify({ format: 1, releases: [data.release] })
    )
    let complete!: (bytes: Buffer) => void
    const shop = new AddonShop({
      ...data,
      hostVersion: '1.0.0',
      download: () =>
        new Promise(resolve => {
          complete = resolve
        }),
      installed: () => []
    })
    shop.setReload(async () => {})
    await shop.start(data.release.id)
    await expect(shop.start(data.release.id)).rejects.toThrow('Another addon')
    complete(data.bytes)
    await finished(shop)
  })
  it('requires a valid catalog signature for network catalogs', async () => {
    const data = await setup(),
      keys = generateKeyPairSync('ed25519'),
      payload = await fs.readFile(data.catalogFile)
    const envelope = Buffer.from(
      JSON.stringify({
        payload: payload.toString('base64'),
        signature: sign(null, payload, keys.privateKey).toString('base64')
      })
    )
    const shop = new AddonShop({
      root: data.root,
      hostVersion: '1.0.0',
      catalogUrl: 'https://github.com/catalog',
      publicKey: keys.publicKey
        .export({ format: 'pem', type: 'spki' })
        .toString(),
      download: async () => envelope
    })
    expect((await shop.getCatalog()).releases).toHaveLength(1)
    const wrong = generateKeyPairSync('ed25519')
    const tampered = new AddonShop({
      root: data.root,
      hostVersion: '1.0.0',
      catalogUrl: 'https://github.com/catalog',
      publicKey: wrong.publicKey
        .export({ format: 'pem', type: 'spki' })
        .toString(),
      download: async () => envelope
    })
    await expect(tampered.getCatalog()).rejects.toThrow('signature')
  })
})

describe('retired addons', () => {
  it('filters old catalogs and deactivates retired installed packages', async () => {
    const { root, catalogFile, release } = await setup()
    await fs.writeFile(
      catalogFile,
      JSON.stringify({
        format: 1,
        releases: [
          release,
          { ...release, id: 'monolith--calendar' },
          { ...release, id: 'monolith--wallet' }
        ]
      })
    )
    const directory = path.join(root, 'storage', 'addons')
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(
      path.join(directory, 'installed.json'),
      JSON.stringify({
        'monolith--wallet': { slot: '1.1.0-abcdef012345', version: '1.1.0' }
      })
    )
    const shop = new AddonShop({ root, catalogFile, hostVersion: '1.0.0' })
    shop.setReload(async () => {})
    expect((await shop.getCatalog()).releases.map(row => row.id)).toEqual([
      'monolith--sample'
    ])
    expect(await shop.directories()).toEqual({})
    await expect(shop.start('monolith--calendar')).rejects.toThrow(
      'no published package'
    )
    expect((await shop.snapshot()).managed).toEqual([])
  })
})
