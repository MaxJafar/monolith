import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Hosts approve addon tables by the sha256 of server/dist/schema.js. A server
// image builds each module in place, while the shop installs the portable
// release build, so both builds must emit the same schema.js.
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

export function schemaAddons(selected = []) {
  return fs
    .readdirSync('modules')
    .sort()
    .filter(
      id =>
        (!selected.length || selected.includes(id)) &&
        fs.existsSync(`modules/${id}/package.json`) &&
        fs.existsSync(`modules/${id}/server/schema.drizzle.ts`)
    )
}

function buildSchema(id, portable) {
  const pkg = JSON.parse(fs.readFileSync(`modules/${id}/package.json`, 'utf8'))
  const env = { ...process.env, MONOLITH_ADDON_RELEASE: portable ? '1' : '' }
  const result = spawnSync(pnpm, ['--filter', pkg.name, 'build:server'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env,
    windowsHide: true
  })

  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr)
    throw Error(`${id} server build failed`)
  }

  return createHash('sha256')
    .update(fs.readFileSync(`modules/${id}/server/dist/schema.js`))
    .digest('hex')
}

// Builds portably last, leaving each module ready for release packaging.
export function schemaParity(ids) {
  const results = ids.map(id => ({
    id,
    image: buildSchema(id, false),
    portable: buildSchema(id, true)
  }))

  for (const { id, image, portable } of results)
    console.info(
      image === portable
        ? `${id}: ${image}`
        : `${id}: image ${image} differs from portable ${portable}`
    )

  return results.filter(item => item.image !== item.portable)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const diverged = schemaParity(schemaAddons(process.argv.slice(2)))

  if (diverged.length) {
    console.error(
      `Server image and portable builds emit different schema.js for ${diverged.map(item => item.id).join(', ')}. Hosts could not approve these addons.`
    )
    process.exitCode = 1
  }
}
