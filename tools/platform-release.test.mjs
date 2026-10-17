import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const temporary = path.join(root, '.temp')
const hash = data => createHash('sha256').update(data).digest('hex')
async function fixture(t) {
  await fs.mkdir(temporary, { recursive: true })
  const folder = await fs.mkdtemp(
    path.join(temporary, 'platform-release-test-')
  )
  t.after(async () => {
    if (
      path.dirname(folder) !== temporary ||
      !path.basename(folder).startsWith('platform-release-test-')
    )
      throw Error('Invalid fixture cleanup path')
    await fs.rm(folder, { recursive: true, force: true })
  })
  const write = async (file, data) => {
    const full = path.join(folder, file)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, data)
  }
  for (const file of ['platform-release.mjs', 'release-version.mjs'])
    await write(
      'tools/' + file,
      await fs.readFile(path.join(root, 'tools', file))
    )
  const pkg = JSON.stringify({
    version: '1.0.0',
    repository: { url: 'https://github.com/test/monolith.git' }
  })
  for (const file of [
    'package.json',
    'apps/web/package.json',
    'apps/api/package.json',
    'apps/desktop/package.json',
    'packages/agent-tools/package.json',
    'apps/desktop/src-tauri/tauri.conf.json'
  ])
    await write(file, pkg)
  await write(
    'apps/desktop/src-tauri/Cargo.toml',
    '[package]\nname = "monolith-desktop"\nversion = "1.0.0"\n'
  )
  await write(
    'apps/desktop/src-tauri/Cargo.lock',
    '[[package]]\nname = "monolith-desktop"\nversion = "1.0.0"\n'
  )
  await write(
    'apps/desktop-macos/Info.plist',
    '<plist><dict><key>CFBundleShortVersionString</key><string>1.0.0</string><key>MonolithReleaseVersion</key><string>1.0.0</string><key>CFBundleVersion</key><string>1.0.0</string></dict></plist>'
  )
  for (const file of [
    'apps/api/schema.drizzle.ts',
    'apps/gateway/internal/server/migrations/0001.sql',
    'modules/one/server/schema.drizzle.ts',
    'packages/file-storage/schema.drizzle.ts'
  ])
    await write(file, 'test schema\n')
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const env = {
    ...process.env,
    GITHUB_REPOSITORY: 'test/monolith',
    MONOLITH_RELEASE_PUBLIC_KEY: publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString(),
    MONOLITH_RELEASE_PRIVATE_KEY: privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString(),
    MONOLITH_RELEASE_NOTES_FILE: ''
  }
  const run = (script, args = [], extra = {}) =>
    spawnSync(process.execPath, [path.join(folder, 'tools', script), ...args], {
      cwd: folder,
      env: { ...env, ...extra },
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000
    })
  const out = 'dist/platform-releases/v1.0.0'
  for (const target of [
    'windows-amd64',
    'darwin-universal',
    'linux-amd64',
    'linux-arm64'
  ]) {
    const data = Buffer.from('fixture archive ' + target),
      filename = target + (target.startsWith('linux') ? '.tar.gz' : '.zip')
    await write(out + '/' + filename, data)
    await write(
      out + '/' + target + '.artifact.json',
      JSON.stringify({
        target,
        url: `https://github.com/test/monolith/releases/download/v1.0.0/${filename}`,
        bytes: data.length,
        sha256: hash(data),
        format: target.startsWith('linux') ? 'docker-archive' : 'zip',
        ...(target.startsWith('linux')
          ? { imageId: 'sha256:' + 'a'.repeat(64) }
          : {})
      })
    )
  }
  return { folder, write, run, publicKey, out }
}
test('release metadata signs every complete platform and rejects altered artifacts', async t => {
  const f = await fixture(t)
  const result = f.run('platform-release.mjs', ['manifest'])
  assert.equal(result.status, 0, result.stderr)
  const envelope = JSON.parse(
    await fs.readFile(
      path.join(f.folder, f.out, 'monolith-release.json'),
      'utf8'
    )
  )
  const bytes = Buffer.from(envelope.payload, 'base64')
  assert.equal(
    verify(null, bytes, f.publicKey, Buffer.from(envelope.signature, 'base64')),
    true
  )
  const payload = JSON.parse(bytes)
  assert.equal(payload.version, '1.0.0')
  assert.equal(payload.artifacts.length, 4)
  assert.match(payload.schemaHash, /^[0-9a-f]{64}$/)
  assert.equal(payload.protocol, 1)
  await f.write(f.out + '/windows-amd64.zip', 'altered')
  assert.notEqual(f.run('platform-release.mjs', ['manifest']).status, 0)
})
test('incomplete builds and mismatched signing keys cannot produce a release', async t => {
  const f = await fixture(t)
  const other = generateKeyPairSync('ed25519')
    .publicKey.export({ format: 'pem', type: 'spki' })
    .toString()
  assert.notEqual(
    f.run('platform-release.mjs', ['manifest'], {
      MONOLITH_RELEASE_PUBLIC_KEY: other
    }).status,
    0
  )
  await fs.unlink(path.join(f.folder, f.out, 'darwin-universal.artifact.json'))
  assert.notEqual(f.run('platform-release.mjs', ['manifest']).status, 0)
  await assert.rejects(
    fs.access(path.join(f.folder, f.out, 'monolith-release.json'))
  )
})
test('one release version reaches web, API and both native clients', async t => {
  const f = await fixture(t),
    version = '1.2.3-beta.4'
  assert.equal(f.run('release-version.mjs', ['v' + version]).status, 0)
  for (const file of [
    'package.json',
    'apps/web/package.json',
    'apps/api/package.json',
    'apps/desktop/package.json',
    'packages/agent-tools/package.json',
    'apps/desktop/src-tauri/tauri.conf.json'
  ])
    assert.equal(
      JSON.parse(await fs.readFile(path.join(f.folder, file), 'utf8')).version,
      version
    )
  for (const file of ['Cargo.toml', 'Cargo.lock'])
    assert.match(
      await fs.readFile(
        path.join(f.folder, 'apps/desktop/src-tauri', file),
        'utf8'
      ),
      /version = "1\.2\.3-beta\.4"/
    )
  const plist = await fs.readFile(
    path.join(f.folder, 'apps/desktop-macos/Info.plist'),
    'utf8'
  )
  assert.ok(
    plist.includes(
      '<key>MonolithReleaseVersion</key><string>' + version + '</string>'
    )
  )
  assert.ok(
    plist.includes(
      '<key>CFBundleShortVersionString</key><string>1.2.3</string>'
    )
  )
  assert.notEqual(f.run('release-version.mjs', ['../../invalid']).status, 0)
})
