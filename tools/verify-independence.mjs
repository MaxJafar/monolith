import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import './verify-product-identity.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const json = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'))
const paths = ['package.json', 'tools/package.json']
for (const base of ['apps', 'packages', 'modules', 'locales'])
  for (const entry of readdirSync(resolve(root, base))) {
    const file = `${base}/${entry}/package.json`
    if (existsSync(resolve(root, file))) paths.push(file)
  }
for (const file of paths) {
  const pkg = json(file)
  assert.equal(pkg.license, '0BSD', `${file}: first-party license must be 0BSD`)
  assert.ok(
    pkg.name === 'monolith' || pkg.name.startsWith('@monolith/'),
    `${file}: Monolith package namespace required`
  )
  assert.equal(
    pkg.author,
    'Monolith contributors',
    `${file}: current maintainer metadata`
  )
  if (file.startsWith('modules/'))
    assert.ok(pkg.monolith, `${file}: Monolith manifest metadata required`)
}
const identities = json('packages/configs/src/compatibility/addons.json')
assert.equal(
  new Set(identities.map(entry => entry.remoteId)).size,
  identities.length
)
assert.equal(
  new Set(identities.map(entry => entry.name)).size,
  identities.length
)
for (const entry of identities) {
  const pkg = json(`modules/${entry.id}/package.json`)
  assert.equal(pkg.name, entry.name)
  assert.equal(pkg.monolith.id, entry.id)
  assert.equal(pkg.monolith.routeId, entry.remoteId)
  const [prefix, icon] = pkg.monolith.icon.split(':')
  const collection = json(`packages/ui/src/assets/icons/${prefix}.json`)
  assert.ok(
    collection.icons?.[icon] || collection.aliases?.[icon],
    `${entry.name}: bundle its sidebar icon for every client`
  )
  assert.match(entry.id, /^monolith--[a-z0-9-]+$/)
  assert.match(entry.remoteId, /^[a-f0-9]{64}$/)
  assert.equal(Object.hasOwn(entry, 'previousName'), false)
}
assert.ok(
  existsSync(resolve(root, 'LICENSE')) &&
    existsSync(resolve(root, 'THIRD_PARTY_NOTICES.md'))
)
const licenseText = file =>
  readFileSync(resolve(root, file), 'utf8').replaceAll('\r\n', '\n')
assert.equal(licenseText('LICENSE'), licenseText('LICENSES/0BSD.txt'))
assert.equal(
  licenseText('packages/ui/LICENSE'),
  licenseText('LICENSES/0BSD.txt')
)
for (const notice of [
  'apps/api/src/core/models/LICENSE',
  'apps/api/src/core/models/NOTICE.md',
  'apps/site/public/fonts/Inter-OFL.txt',
  'apps/site/public/fonts/JetBrainsMono-OFL.txt',
  'packages/ui/src/assets/icons/icon-notices.json',
  'modules/monolith--gym/NOTICE.md',
  'modules/monolith--redraw/THIRD_PARTY_LICENSES.txt',
  'modules/monolith--redraw/client/ICONS-LICENSE.txt'
])
  assert.ok(
    existsSync(resolve(root, notice)),
    `Missing third-party notice: ${notice}`
  )
console.info(
  `Monolith package metadata verified: ${paths.length} packages, ${identities.length} preserved addon identities, license notices present. This checks product identity, not source authorship.`
)
