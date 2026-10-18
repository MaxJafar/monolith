import fs from 'node:fs/promises'
import path from 'node:path'

if (
  process.env.CI !== 'true' ||
  !process.env.GITHUB_TOKEN ||
  !process.env.MONOLITH_RELEASE_NOTES_FILE
)
  throw Error('Run note generation in the tagged release workflow')
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'))
const tag = `v${pkg.version}`,
  repository = process.env.GITHUB_REPOSITORY
if (
  process.env.GITHUB_REF !== `refs/tags/${tag}` ||
  !/^[\w.-]+\/[\w.-]+$/.test(repository || '')
)
  throw Error('Invalid release repository or tag')
const response = await fetch(
  `https://api.github.com/repos/${repository}/releases/generate-notes`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2026-03-10'
    },
    body: JSON.stringify({ tag_name: tag }),
    redirect: 'error',
    signal: AbortSignal.timeout(60000)
  }
)
if (!response.ok)
  throw Error(`Could not generate release notes: HTTP ${response.status}`)
const { body } = await response.json()
if (typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > 32000)
  throw Error('Review and shorten release notes before signing')
const highlights = await fs
  .readFile(path.join('release', 'notes', `${pkg.version}.md`), 'utf8')
  .catch(error => {
    if (error.code === 'ENOENT') return ''
    throw error
  })
const file = path.resolve(process.env.MONOLITH_RELEASE_NOTES_FILE)
await fs.mkdir(path.dirname(file), { recursive: true })
const introduction =
  process.env.MONOLITH_UNSIGNED_INSTALLERS === '1'
    ? `Monolith ${pkg.version} enables automatic updates for Windows, macOS and the hosted Linux server. Update notifications, download progress and rollback are available in Settings → Updates. Downloads and installation are enabled by default; desktop restarts wait for two background idle minutes and clean drafts. Servers install during their configured maintenance window.\n\nInstallers remain unsigned (macOS uses an ad-hoc signature without notarization). Update manifests and archives are authenticated with the pinned Monolith release key. Existing v0.1.3 and preview clients need this installer once because those builds omitted that key. Server administrators must install the external supervisor; see [installation and updates](https://github.com/${repository}/blob/main/docs/UPDATES.md).\n\n`
    : ''
const notes = [highlights.trim(), introduction.trim(), body.trim()]
  .filter(Boolean)
  .join('\n\n')
if (Buffer.byteLength(notes, 'utf8') > 32000)
  throw Error('Review and shorten release notes before signing')
await fs.writeFile(file, notes + '\n', 'utf8')
console.log('Prepared release notes for the signed manifest and GitHub release')
