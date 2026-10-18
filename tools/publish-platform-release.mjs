import { openAsBlob } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { validateInventory } from './preview-release.mjs'

if (
  process.env.CI !== 'true' ||
  !process.env.GITHUB_REF?.startsWith('refs/tags/v') ||
  !process.env.GITHUB_TOKEN
)
  throw Error('Publishing is restricted to the tagged release workflow')
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')),
  repository = process.env.GITHUB_REPOSITORY,
  tag = `v${pkg.version}`
if (process.env.GITHUB_REF !== `refs/tags/${tag}`)
  throw Error('Release tag does not match the built version')
const folder = path.resolve('dist/platform-releases', tag)
const preview = process.argv.includes('--preview')
const unsigned = process.argv.includes('--unsigned')
if (preview && unsigned) throw Error('Choose one release distribution')
const manual = preview || unsigned
let inventory
if (manual) {
  inventory = JSON.parse(
    await fs.readFile(path.join(folder, 'manual-release.json'), 'utf8')
  )
  if (inventory.version !== pkg.version)
    throw Error('Manual release version mismatch')
  await validateInventory(folder, inventory)
  if (
    inventory.distribution !== (unsigned ? 'manual-unsigned' : 'manual-preview')
  )
    throw Error(
      'Manual publication requires the selected distribution inventory'
    )
} else {
  inventory = JSON.parse(
    await fs.readFile(path.join(folder, 'release-downloads.json'), 'utf8')
  )
  if (
    inventory.version !== pkg.version ||
    inventory.distribution !== 'signed-updates'
  )
    throw Error('Signed release inventory mismatch')
  await validateInventory(
    folder,
    inventory,
    await fs.readFile('release/keys/app-release.pem')
  )
}
await fs.access(path.join(folder, 'SHA256SUMS'))
const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10'
}
const api = async (url, method = 'GET', body) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${url}`,
    {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000)
    }
  )
  if (response.status === 404 && method === 'GET') return null
  if (!response.ok)
    throw Error(`GitHub release API returned ${response.status}`)
  return response.status === 204 ? null : response.json()
}
let release = await api(`releases/tags/${tag}`)
if (release && !release.draft)
  throw Error(
    'This version is already published. Published release assets are never overwritten; publish a newer version instead.'
  )
const notes = process.env.MONOLITH_RELEASE_NOTES_FILE
  ? await fs.readFile(process.env.MONOLITH_RELEASE_NOTES_FILE, 'utf8')
  : `Monolith ${pkg.version}`
if (!release)
  release = await api('releases', 'POST', {
    tag_name: tag,
    name: `Monolith ${pkg.version}`,
    body: notes,
    draft: true,
    prerelease: pkg.version.includes('-')
  })
const assets = [
  ...inventory.files.map(file => file.name),
  manual ? 'manual-release.json' : 'release-downloads.json',
  'SHA256SUMS'
]
// Publish the signed manifest last, and make the release visible only when every
// asset has uploaded successfully. A partial job leaves a recoverable draft.
assets.sort(
  (a, b) =>
    Number(a === 'monolith-release.json') -
    Number(b === 'monolith-release.json')
)
for (const file of assets) {
  const existing = release.assets?.find(asset => asset.name === file)
  if (existing) await api(`releases/assets/${existing.id}`, 'DELETE')
  const blob = await openAsBlob(path.join(folder, file))
  if (blob.size >= 2 * 1024 ** 3) throw Error(`Split oversized asset ${file}`)
  const url = new URL(release.upload_url.replace(/\{.*$/, ''))
  url.searchParams.set('name', file)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(blob.size)
    },
    body: blob,
    signal: AbortSignal.timeout(1800000)
  })
  if (!response.ok) throw Error(`Could not upload ${file}: ${response.status}`)
  console.log(`Uploaded ${file}`)
}
await api(`releases/${release.id}`, 'PATCH', {
  draft: false,
  body: notes,
  prerelease: pkg.version.includes('-'),
  make_latest: pkg.version.includes('-') ? 'false' : 'true'
})
console.log(`Published ${tag}`)
