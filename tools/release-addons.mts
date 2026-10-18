import { createHash, sign } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import {
  type AddonRelease,
  addonCatalogSchema,
  coreAddonIds
} from '@monolith/configs'

import { safePackagePath } from '../apps/api/src/lib/modules/shop/archive'

const root = process.cwd()
const pkg = JSON.parse(
  await fs.readFile(path.join(root, 'package.json'), 'utf8')
)
const repository = process.env.GITHUB_REPOSITORY || 'MaxJafar/monolith'
if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
  throw Error('Invalid release repository')
const tag = process.env.MONOLITH_RELEASE_TAG || `v${pkg.version}`
if (!/^[a-zA-Z0-9_.-]+$/.test(tag)) throw Error('Invalid release tag')
const output = path.resolve(root, 'dist', 'releases', tag)
const only = process.argv.slice(2)
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const releases: AddonRelease[] = []
await fs.mkdir(output, { recursive: true })
for (const dir of (
  await fs.readdir(path.join(root, 'modules'), { withFileTypes: true })
).sort((a, b) => a.name.localeCompare(b.name))) {
  if (
    !dir.isDirectory() ||
    (coreAddonIds as readonly string[]).includes(dir.name) ||
    (only.length && !only.includes(dir.name))
  )
    continue
  const directory = path.join(root, 'modules', dir.name)
  const source = JSON.parse(
    await fs.readFile(path.join(directory, 'package.json'), 'utf8')
  )
  const metadata = JSON.parse(
    await fs.readFile(
      path.join(directory, 'client/dist/monolith-manifest.json'),
      'utf8'
    )
  )
  if (
    metadata.package.version !== source.version ||
    metadata.package.name !== source.name ||
    !metadata.distribution?.portable
  )
    throw Error(
      `Rebuild ${dir.name} with MONOLITH_ADDON_RELEASE=1 before packaging`
    )
  const files: { path: string; data: string }[] = []
  const runtime = {
    name: source.name,
    version: source.version,
    type: 'module',
    displayName: source.displayName,
    description: source.description,
    author: source.author,
    license: source.license ?? pkg.license,
    monolith: source.monolith
  }
  files.push({
    path: 'package.json',
    data: Buffer.from(JSON.stringify(runtime)).toString('base64')
  })
  async function walk(relative: string) {
    for (const entry of (
      await fs.readdir(path.join(directory, relative), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${relative}/${entry.name}`
      if (entry.isSymbolicLink()) throw Error(`Symlink in package: ${name}`)
      if (entry.isDirectory()) await walk(name)
      else if (safePackagePath(name))
        files.push({
          path: name,
          data: (await fs.readFile(path.join(directory, name))).toString(
            'base64'
          )
        })
    }
  }
  await walk('client/dist')
  if (metadata.hasServer) await walk('server/dist')
  await walk('locales')
  for (const name of ['LICENSE', 'NOTICE.md', 'README.md']) {
    try {
      files.push({
        path: name,
        data: (await fs.readFile(path.join(directory, name))).toString('base64')
      })
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      if (name === 'LICENSE')
        files.push({
          path: name,
          data: (await fs.readFile(path.join(root, 'LICENSE'))).toString(
            'base64'
          )
        })
    }
  }
  const bytes = gzipSync(
    JSON.stringify({
      format: 1,
      id: dir.name,
      version: source.version,
      hostVersion: pkg.version,
      files
    }),
    { level: 9 }
  )
  const filename = `${dir.name}-${source.version}.monolith-addon`
  await fs.writeFile(path.join(output, filename), bytes)
  const schema = files.find(file => file.path === 'server/dist/schema.js')
  releases.push({
    id: dir.name,
    name: source.displayName,
    description: source.description,
    icon: source.monolith.icon,
    category: source.monolith.category,
    kind: source.monolith.experience?.kind === 'widget' ? 'widget' : 'addon',
    version: source.version,
    hostVersion: pkg.version,
    url: `https://github.com/${repository}/releases/download/${tag}/${filename}`,
    sha256: hash(bytes),
    bytes: bytes.length,
    schemaHash: schema ? hash(Buffer.from(schema.data, 'base64')) : null,
    notes: `${source.displayName} ${source.version}. Built for Monolith ${pkg.version}.`,
    widgets: metadata.widgets.map((widget: { id: string }) => widget.id)
  })
}
if (!releases.length) throw Error('No addon packages selected')
const payload = Buffer.from(
  JSON.stringify(addonCatalogSchema.parse({ format: 1, releases }), null, 2) +
    '\n'
)
await fs.writeFile(path.join(output, 'addon-catalog.json'), payload)
// Install this host-side approval only AFTER applying and checking the matching
// host database migration. It is never accepted from the downloaded catalog.
await fs.writeFile(
  path.join(output, 'addon-schemas.json'),
  JSON.stringify(
    {
      hostVersion: pkg.version,
      schemas: Object.fromEntries(
        releases
          .filter(item => item.schemaHash)
          .map(item => [item.id, item.schemaHash])
      )
    },
    null,
    2
  ) + '\n'
)
if (process.env.MONOLITH_RELEASE_PRIVATE_KEY) {
  const signature = sign(
    null,
    payload,
    process.env.MONOLITH_RELEASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  ).toString('base64')
  await fs.writeFile(
    path.join(output, 'addon-catalog.signed.json'),
    JSON.stringify({ payload: payload.toString('base64'), signature })
  )
}
await fs.writeFile(
  path.join(output, 'SHA256SUMS'),
  releases
    .map(item => `${item.sha256}  ${item.id}-${item.version}.monolith-addon`)
    .join('\n') + '\n'
)
console.info(
  `Prepared ${releases.length} independent addon packages in ${output}. Nothing published.`
)
