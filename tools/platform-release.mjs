import { spawnSync } from 'node:child_process'
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign
} from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

import { verifyWindowsFiles } from './verify-windows-release.mjs'

const root = path.resolve(import.meta.dirname, '..')
const pkg = JSON.parse(
  await fs.readFile(path.join(root, 'package.json'), 'utf8')
)
const repository =
  process.env.GITHUB_REPOSITORY ||
  pkg.repository.url.replace('https://github.com/', '').replace(/\.git$/, '')
const version = pkg.version
const output = path.join(root, 'dist/platform-releases', `v${version}`)
const run = (name, args, options = {}) => {
  const result = spawnSync(name, args, {
    cwd: root,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    windowsHide: true,
    ...options
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw Error(`${name} exited ${result.status}`)
  return result.stdout?.trim()
}
const go = args =>
  run(process.execPath, ['tools/native-toolchain.mjs', 'go', ...args])
async function fingerprint() {
  const files = []
  async function visit(folder) {
    for (const item of await fs.readdir(path.join(root, folder), {
      withFileTypes: true
    })) {
      if (
        [
          'node_modules',
          'dist',
          'target',
          '.temp',
          '.git',
          '.turbo',
          'tsbuild'
        ].includes(item.name)
      )
        continue
      const relative = `${folder}/${item.name}`
      if (item.isDirectory()) await visit(relative)
      else if (
        item.isFile() &&
        (item.name.endsWith('schema.drizzle.ts') ||
          (relative.includes('/migrations/') && item.name.endsWith('.sql')))
      )
        files.push(relative)
    }
  }
  await visit('apps/api')
  await visit('apps/gateway/internal/server/migrations')
  await visit('modules')
  await visit('packages/file-storage')
  const hash = createHash('sha256')
  for (const file of files.sort())
    hash
      .update(file)
      .update('\0')
      .update(
        (await fs.readFile(path.join(root, file), 'utf8')).replaceAll(
          '\r\n',
          '\n'
        )
      )
      .update('\0')
  return hash.digest('hex')
}
async function fileHash(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
const command = process.argv[2]
if (command === 'schema') {
  console.log(await fingerprint())
  process.exit(0)
}
await fs.mkdir(output, { recursive: true })
if (command === 'client') {
  const target = process.argv[3]
  if (!['windows-amd64', 'darwin-universal'].includes(target))
    throw Error('Select windows-amd64 or darwin-universal')
  const app =
    target === 'windows-amd64'
      ? await fs.mkdtemp(path.join(output, 'windows-app-'))
      : path.join(root, '.temp/macos/Monolith.app')
  if (target === 'windows-amd64') {
    if (process.env.MONOLITH_UNSIGNED_INSTALLERS !== '1')
      await verifyWindowsFiles([
        path.join(
          root,
          'apps/desktop/src-tauri/target/release/monolith-desktop.exe'
        ),
        path.join(root, 'apps/desktop/src-tauri/updater/monolith-updater.exe')
      ])
    // A dedicated generated staging directory; no application/user files are removed.
    await fs.mkdir(app, { recursive: true })
    await fs.copyFile(
      path.join(
        root,
        'apps/desktop/src-tauri/target/release/monolith-desktop.exe'
      ),
      path.join(app, 'monolith-desktop.exe')
    )
    await fs.cp(
      path.join(root, 'apps/desktop/src-tauri/updater'),
      path.join(app, 'updater'),
      { recursive: true }
    )
    for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md'])
      await fs.copyFile(path.join(root, file), path.join(app, file))
    await fs.copyFile(
      path.join(root, 'packages/ui/src/assets/icons/icon-notices.json'),
      path.join(app, 'icon-notices.json')
    )
  }
  const marker =
    target === 'windows-amd64'
      ? path.join(app, 'updater/settings.json')
      : path.join(app, 'Contents/Resources/updater/settings.json')
  const settings = JSON.parse(await fs.readFile(marker, 'utf8'))
  if (
    settings.version !== version ||
    settings.repository !== repository ||
    !settings.publicKey
  )
    throw Error(
      'Align release versions and embed the release public key before packaging clients'
    )
  const embeddedKey = createPublicKey(
    settings.publicKey.replaceAll('\\n', '\n')
  ).export({ format: 'der', type: 'spki' })
  const releaseKey = createPublicKey(
    (process.env.MONOLITH_RELEASE_PUBLIC_KEY || '').replaceAll('\\n', '\n')
  ).export({ format: 'der', type: 'spki' })
  if (!embeddedKey.equals(releaseKey))
    throw Error('Client public key does not match the release key')
  if (target === 'darwin-universal') {
    if (process.env.MONOLITH_UNSIGNED_INSTALLERS === '1') {
      if (!settings.macAllowAdHoc || settings.macTeamId)
        throw Error('Unsigned Mac updates require an explicit ad-hoc policy')
    } else if (!settings.macTeamId || settings.macAllowAdHoc) {
      throw Error('A Developer ID team is required for signed installers')
    }
    run('codesign', [
      '--verify',
      '--deep',
      '--strict',
      '-R',
      'identifier "app.monolith.desktop"',
      app
    ])
    if (process.env.MONOLITH_UNSIGNED_INSTALLERS !== '1')
      run('spctl', ['--assess', '--type', 'execute', app])
  }
  const filename = `monolith-${version}-${target}.zip`,
    file = path.join(output, filename)
  go(['run', './cmd/release-archive', '--directory', app, '--output', file])
  const artifact = {
    target,
    url: `https://github.com/${repository}/releases/download/v${version}/${filename}`,
    bytes: (await fs.stat(file)).size,
    sha256: await fileHash(file),
    format: 'zip'
  }
  await fs.writeFile(
    path.join(output, `${target}.artifact.json`),
    JSON.stringify(artifact, null, 2) + '\n'
  )
} else if (command === 'server') {
  const target = process.argv[3] || 'linux-amd64'
  if (!['linux-amd64', 'linux-arm64'].includes(target))
    throw Error('Unsupported server target')
  const schemaHash = await fingerprint(),
    tag = `monolith-release:${version}-${target}`
  run('docker', [
    'buildx',
    'build',
    '--load',
    '--platform',
    target.replace('-', '/'),
    '--build-arg',
    `MONOLITH_VERSION=${version}`,
    '--build-arg',
    `MONOLITH_SCHEMA_HASH=${schemaHash}`,
    '--file',
    'docker/server/Dockerfile',
    '--tag',
    tag,
    '.'
  ])
  const imageId = run(
    'docker',
    ['image', 'inspect', '--format', '{{.Id}}', tag],
    { capture: true }
  )
  const tar = path.join(output, `${target}.tar`),
    filename = `monolith-${version}-${target}.tar.gz`,
    file = path.join(output, filename)
  run('docker', ['image', 'save', '--output', tar, tag])
  await pipeline(
    createReadStream(tar),
    createGzip({ level: 6 }),
    createWriteStream(file)
  )
  await fs.unlink(tar)
  const artifact = {
    target,
    url: `https://github.com/${repository}/releases/download/v${version}/${filename}`,
    bytes: (await fs.stat(file)).size,
    sha256: await fileHash(file),
    format: 'docker-archive',
    imageId
  }
  // GitHub release assets must each be smaller than 2 GiB. Split large Docker
  // exports; the updater verifies each part and the concatenated archive.
  const partSize = 1900 * 1024 * 1024
  if (artifact.bytes > partSize) {
    artifact.parts = []
    for (
      let start = 0, index = 1;
      start < artifact.bytes;
      start += partSize, index++
    ) {
      const name = `${filename}.part${String(index).padStart(2, '0')}`,
        part = path.join(output, name)
      await pipeline(
        createReadStream(file, {
          start,
          end: Math.min(start + partSize, artifact.bytes) - 1
        }),
        createWriteStream(part)
      )
      artifact.parts.push({
        url: `https://github.com/${repository}/releases/download/v${version}/${name}`,
        bytes: (await fs.stat(part)).size,
        sha256: await fileHash(part)
      })
    }
    await fs.unlink(file)
  }
  await fs.writeFile(
    path.join(output, `${target}.artifact.json`),
    JSON.stringify(artifact, null, 2) + '\n'
  )
  run(process.execPath, ['tools/build-updater.mjs', target])
  await fs.copyFile(
    path.join(root, '.temp/updaters', target, 'monolith-updater'),
    path.join(output, `monolith-updater-${target}`)
  )
} else if (command === 'manifest') {
  const artifacts = []
  for (const filename of await fs.readdir(output))
    if (filename.endsWith('.artifact.json')) {
      const artifact = JSON.parse(
        await fs.readFile(path.join(output, filename), 'utf8')
      )
      const fullHash = createHash('sha256')
      let total = 0
      for (const part of artifact.parts || [artifact]) {
        const file = path.join(
          output,
          new URL(part.url).pathname.split('/').at(-1)
        )
        if (
          (await fs.stat(file)).size !== part.bytes ||
          (await fileHash(file)) !== part.sha256
        )
          throw Error(`Artifact changed: ${filename}`)
        for await (const chunk of createReadStream(file)) {
          fullHash.update(chunk)
          total += chunk.length
        }
      }
      if (
        total !== artifact.bytes ||
        fullHash.digest('hex') !== artifact.sha256
      )
        throw Error(`Artifact parts do not match ${filename}`)
      artifacts.push(artifact)
    }
  const required = [
    'windows-amd64',
    'darwin-universal',
    'linux-amd64',
    'linux-arm64'
  ]
  if (
    required.some(
      target =>
        artifacts.filter(artifact => artifact.target === target).length !== 1
    )
  )
    throw Error(
      'All four platform artifacts are required for a complete release'
    )
  const privateKey = createPrivateKey(
    (process.env.MONOLITH_RELEASE_PRIVATE_KEY || '').replaceAll('\\n', '\n')
  )
  if (privateKey.asymmetricKeyType !== 'ed25519')
    throw Error('Use an Ed25519 release signing key')
  const actual = createPublicKey(privateKey).export({
    format: 'der',
    type: 'spki'
  })
  const expected = createPublicKey(
    (process.env.MONOLITH_RELEASE_PUBLIC_KEY || '').replaceAll('\\n', '\n')
  ).export({ format: 'der', type: 'spki' })
  if (!actual.equals(expected))
    throw Error('Private and embedded public release keys do not match')
  const notesFile = process.env.MONOLITH_RELEASE_NOTES_FILE
  const release = {
    format: 1,
    version,
    channel: version.includes('-') ? 'beta' : 'stable',
    protocol: 1,
    schemaHash: await fingerprint(),
    notes: notesFile
      ? await fs.readFile(notesFile, 'utf8')
      : `Monolith ${version}`,
    artifacts
  }
  if (Buffer.byteLength(release.notes, 'utf8') > 32000)
    throw Error('Release notes are too long')
  const payload = Buffer.from(JSON.stringify(release)),
    envelope = {
      payload: payload.toString('base64'),
      signature: sign(null, payload, privateKey).toString('base64')
    }
  await fs.writeFile(
    path.join(output, 'monolith-release.json'),
    JSON.stringify(envelope, null, 2) + '\n'
  )
  const downloads = (await fs.readdir(output)).filter(
    file =>
      /\.(zip|gz|exe|dmg)$|\.part\d+$/.test(file) ||
      file.startsWith('monolith-updater-') ||
      file === 'monolith-release.json'
  )
  await fs.writeFile(
    path.join(output, 'SHA256SUMS'),
    (
      await Promise.all(
        downloads.map(
          async file => `${await fileHash(path.join(output, file))}  ${file}`
        )
      )
    ).join('\n') + '\n'
  )
} else
  throw Error(
    'Usage: platform-release.mjs schema | client <target> | server <target> | manifest'
  )
console.log(
  `Prepared ${command} artifacts in dist/platform-releases/v${version}`
)
