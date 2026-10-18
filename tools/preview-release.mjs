import { spawnSync } from 'node:child_process'
import { createHash, createPublicKey, verify } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const targets = [
  'windows-amd64',
  'darwin-universal',
  'linux-amd64',
  'linux-arm64'
]
const hash = async file => {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  return digest.digest('hex')
}
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32' && command === 'pnpm'
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw Error(`${command} failed: ${result.status}`)
}

export async function validateInventory(folder, manifest, publicKey) {
  const automatic = manifest.distribution === 'signed-updates'
  const inventoryName = automatic
    ? 'release-downloads.json'
    : 'manual-release.json'
  if (
    manifest.format !== 1 ||
    (!automatic && manifest.distribution !== 'manual-preview') ||
    !(
      automatic
        ? /^\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/
        : /^\d+\.\d+\.\d+-preview\.\d+$/
    ).test(manifest.version)
  )
    throw Error('Invalid preview or signed release version')
  for (const target of [...targets, 'server-kit', 'agent-tools', 'addons'])
    if (!manifest.files.some(file => file.target === target))
      throw Error(`Missing release target: ${target}`)
  const names = new Set()
  for (const item of manifest.files) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(item.name) || names.has(item.name))
      throw Error('Invalid or duplicate asset name')
    names.add(item.name)
    const file = path.join(folder, item.name)
    const stat = await fs.lstat(file)
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size !== item.bytes ||
      stat.size === 0 ||
      stat.size >= 2 * 1024 ** 3 ||
      (await hash(file)) !== item.sha256
    )
      throw Error(`Asset verification failed: ${item.name}`)
  }
  const files = (await fs.readdir(folder, { withFileTypes: true })).filter(
    entry =>
      entry.isFile() &&
      !entry.name.endsWith('.artifact.json') &&
      ![inventoryName, 'SHA256SUMS'].includes(entry.name)
  )
  if (files.some(file => !names.has(file.name)))
    throw Error('Unlisted release asset')
  if (automatic) {
    if (!publicKey) throw Error('A pinned release public key is required')
    const envelope = JSON.parse(
      await fs.readFile(path.join(folder, 'monolith-release.json'), 'utf8')
    )
    const payload = Buffer.from(envelope.payload, 'base64')
    if (
      !verify(
        null,
        payload,
        publicKey,
        Buffer.from(envelope.signature, 'base64')
      )
    )
      throw Error('Invalid main release signature')
    const release = JSON.parse(payload)
    if (
      release.version !== manifest.version ||
      release.format !== 1 ||
      release.protocol !== 1 ||
      release.channel !== (manifest.version.includes('-') ? 'beta' : 'stable')
    )
      throw Error('Signed release metadata does not match the downloads')
    for (const target of targets) {
      const artifacts = release.artifacts.filter(item => item.target === target)
      if (artifacts.length !== 1)
        throw Error('Missing signed update target: ' + target)
      for (const part of artifacts[0].parts || artifacts) {
        const name = new URL(part.url).pathname.split('/').at(-1)
        const item = manifest.files.find(file => file.name === name)
        if (!item || item.bytes !== part.bytes || item.sha256 !== part.sha256)
          throw Error(
            'Signed update archive does not match downloads: ' + target
          )
      }
    }
    for (const target of targets.slice(2))
      if (!names.has('monolith-updater-' + target))
        throw Error('Missing server update supervisor: ' + target)
  }
}

export async function prepare(
  root,
  command,
  target,
  { automatic = false } = {}
) {
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, 'package.json'), 'utf8')
  )
  const version = pkg.version
  if (
    !(
      automatic
        ? /^\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/
        : /^\d+\.\d+\.\d+-preview\.\d+$/
    ).test(version)
  )
    throw Error('Select an explicit preview or a signed stable/beta/rc version')
  const inventoryName = automatic
    ? 'release-downloads.json'
    : 'manual-release.json'
  const folder = path.join(root, 'dist/platform-releases', `v${version}`)
  await fs.mkdir(folder, { recursive: true })
  const kit = async () => {
    const stage = path.join(root, '.temp', `server-kit-${version}`)
    await fs.mkdir(path.join(stage, 'docker/server'), { recursive: true })
    await fs.mkdir(path.join(stage, 'env'), { recursive: true })
    let compose = await fs.readFile(
      path.join(root, 'docker-compose.yaml'),
      'utf8'
    )
    compose = compose
      .replace(/    build:\r?\n(?:      .*\r?\n)+/, '')
      .replaceAll(
        'image: monolith-server:local',
        'image: ${MONOLITH_SERVER_IMAGE:?Set MONOLITH_SERVER_IMAGE}'
      )
    if (/^    build:/m.test(compose))
      throw Error('Server kit must use prebuilt images')
    await fs.writeFile(path.join(stage, 'compose.yaml'), compose)
    for (const file of [
      'LICENSE',
      'THIRD_PARTY_NOTICES.md',
      'docker/server/init-db.sh'
    ])
      await fs.copyFile(path.join(root, file), path.join(stage, file))
    const environment = await fs.readFile(
      path.join(root, 'env/.env.docker.example'),
      'utf8'
    )
    await fs.writeFile(
      path.join(stage, 'env/.env.docker.example'),
      `MONOLITH_SERVER_IMAGE=monolith-release:${version}-linux-amd64\n` +
        environment
    )
    if (automatic) {
      await fs.cp(
        path.join(root, 'docker/updates'),
        path.join(stage, 'docker/updates'),
        { recursive: true }
      )
      await fs.copyFile(
        path.join(root, 'release/keys/app-release.pem'),
        path.join(stage, 'docker/updates/app-release.pem')
      )
      await fs.copyFile(
        path.join(root, 'docs/UPDATES.md'),
        path.join(stage, 'UPDATES.md')
      )
    }
    await fs.copyFile(
      path.join(root, 'release/INSTALL.md'),
      path.join(stage, 'README.md')
    )
    run(
      process.execPath,
      [
        'tools/native-toolchain.mjs',
        'go',
        'run',
        './cmd/release-archive',
        '--directory',
        stage,
        '--output',
        path.join(folder, `monolith-${version}-server-kit.zip`)
      ],
      root
    )
    return stage
  }
  if (command === 'client') {
    if (!targets.slice(0, 2).includes(target))
      throw Error('Invalid client target')
    const directory = path.join(
      root,
      target === 'windows-amd64'
        ? 'apps/desktop/src-tauri/target/release/bundle/nsis'
        : '.temp/macos'
    )
    const extension = target === 'windows-amd64' ? '.exe' : '.dmg'
    const names = (await fs.readdir(directory)).filter(
      name => name.includes(version) && name.endsWith(extension)
    )
    if (names.length !== 1)
      throw Error(`Expected exactly one ${version} installer`)
    await fs.copyFile(
      path.join(directory, names[0]),
      path.join(folder, `monolith-${version}-${target}${extension}`)
    )
  } else if (command === 'kit') {
    await kit()
  } else if (command === 'extras') {
    await kit()
    for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md'])
      await fs.copyFile(
        path.join(root, file),
        path.join(root, 'packages/agent-tools', file)
      )
    run(
      'pnpm',
      ['--dir', 'packages/agent-tools', 'pack', '--pack-destination', folder],
      root
    )
    const addons = path.join(root, 'dist/releases', `v${version}`)
    for (const file of await fs.readdir(addons))
      if (file.endsWith('.monolith-addon') || file.endsWith('.json'))
        await fs.copyFile(path.join(addons, file), path.join(folder, file))
    await fs.copyFile(
      path.join(root, 'release/keys/addon-catalog.pem'),
      path.join(folder, 'addon-catalog-public.pem')
    )
  } else if (command === 'manifest') {
    const envelope = JSON.parse(
      await fs.readFile(path.join(folder, 'addon-catalog.signed.json'), 'utf8')
    )
    const payload = Buffer.from(envelope.payload, 'base64')
    const catalogKey = await fs.readFile(
      path.join(root, 'release/keys/addon-catalog.pem')
    )
    const packagedKey = await fs.readFile(
      path.join(folder, 'addon-catalog-public.pem')
    )
    if (
      !createPublicKey(catalogKey)
        .export({ format: 'der', type: 'spki' })
        .equals(
          createPublicKey(packagedKey).export({ format: 'der', type: 'spki' })
        )
    )
      throw Error('Packaged addon key does not match the pinned catalog key')
    if (
      !verify(
        null,
        payload,
        catalogKey,
        Buffer.from(envelope.signature, 'base64')
      )
    )
      throw Error('Invalid addon catalog signature')
    const catalog = JSON.parse(payload)
    const core = new Set(
      ['calendar', 'projects', 'todo-list', 'notes', 'databases'].map(
        id => `monolith--${id}`
      )
    )
    const expected = (
      await fs.readdir(path.join(root, 'modules'), { withFileTypes: true })
    )
      .filter(entry => entry.isDirectory() && !core.has(entry.name))
      .map(entry => entry.name)
    if (
      catalog.releases.length !== expected.length ||
      expected.some(
        id => catalog.releases.filter(addon => addon.id === id).length !== 1
      )
    )
      throw Error('Every optional addon must be present exactly once')
    for (const addon of catalog.releases) {
      const file = path.join(
        folder,
        `${addon.id}-${addon.version}.monolith-addon`
      )
      if (
        addon.hostVersion !== version ||
        (await hash(file)) !== addon.sha256 ||
        (await fs.stat(file)).size !== addon.bytes
      )
        throw Error(`Invalid addon: ${addon.id}`)
    }
    const serverFiles = new Map()
    for (const server of targets.slice(2)) {
      const artifact = JSON.parse(
        await fs.readFile(path.join(folder, `${server}.artifact.json`), 'utf8')
      )
      if (artifact.target !== server)
        throw Error('Incorrect server architecture')
      const aggregate = createHash('sha256')
      let size = 0
      for (const part of artifact.parts || [artifact]) {
        const name = new URL(part.url).pathname.split('/').at(-1)
        if (!/^[a-zA-Z0-9_.-]+$/.test(name))
          throw Error('Invalid server archive path')
        const file = path.join(folder, name)
        if (
          (await hash(file)) !== part.sha256 ||
          (await fs.stat(file)).size !== part.bytes
        )
          throw Error(`Invalid server archive: ${name}`)
        for await (const chunk of createReadStream(file)) {
          aggregate.update(chunk)
          size += chunk.length
        }
        serverFiles.set(name, server)
      }
      if (
        size !== artifact.bytes ||
        aggregate.digest('hex') !== artifact.sha256
      )
        throw Error('Incomplete server archive')
    }
    const files = []
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const name = entry.name
      if (
        !entry.isFile() ||
        name.endsWith('.artifact.json') ||
        [inventoryName, 'SHA256SUMS'].includes(name)
      )
        continue
      const target =
        name === `monolith-${version}-windows-amd64.exe`
          ? 'windows-amd64'
          : name === `monolith-${version}-darwin-universal.dmg`
            ? 'darwin-universal'
            : name === `monolith-${version}-server-kit.zip`
              ? 'server-kit'
              : name === `monolith-agent-tools-${version}.tgz`
                ? 'agent-tools'
                : serverFiles.get(name) ||
                  (name.endsWith('.monolith-addon') ? 'addons' : 'metadata')
      files.push({
        name,
        target,
        bytes: (await fs.stat(path.join(folder, name))).size,
        sha256: await hash(path.join(folder, name))
      })
    }
    const manifest = {
      format: 1,
      distribution: automatic ? 'signed-updates' : 'manual-preview',
      version,
      files: files.sort((a, b) => a.name.localeCompare(b.name))
    }
    await validateInventory(
      folder,
      manifest,
      automatic
        ? await fs.readFile(path.join(root, 'release/keys/app-release.pem'))
        : undefined
    )
    await fs.writeFile(
      path.join(folder, inventoryName),
      JSON.stringify(manifest, null, 2) + '\n'
    )
    await fs.writeFile(
      path.join(folder, 'SHA256SUMS'),
      [
        ...manifest.files,
        {
          name: inventoryName,
          sha256: await hash(path.join(folder, inventoryName))
        }
      ]
        .map(file => `${file.sha256}  ${file.name}`)
        .join('\n') + '\n'
    )
    console.log(
      `Verified ${files.length} ${automatic ? 'signed release' : 'preview'} downloads.`
    )
  } else throw Error('Select client, kit, extras or manifest')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await prepare(
    path.resolve(import.meta.dirname, '..'),
    process.argv[2],
    process.argv[3]
  )
