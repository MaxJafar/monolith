import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// Local integration fixture only. The production downloader is unchanged.
const root = path.resolve(import.meta.dirname, '../..')
dotenv.config({ path: path.join(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_URL!)
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  database.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(database.pathname)
)
  throw Error(
    'The fixture host only supports the isolated development database'
  )
const hostVersion = JSON.parse(
  await fs.readFile(path.join(root, 'package.json'), 'utf8')
).version
const catalogFile = path.join(
  root,
  'dist/releases',
  process.env.MONOLITH_RELEASE_TAG || `v${hostVersion}`,
  'addon-catalog.json'
)
const catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'))
const owner = randomUUID(),
  stateRoot = await fs.mkdtemp(path.join(root, '.temp/shop-download-'))
Object.assign(process.env, {
  PORT: '3639',
  MONOLITH_CORE_ONLY: '1',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5187,http://localhost:5188',
  MONOLITH_ADDON_STATE_ROOT: stateRoot,
  MONOLITH_ADDON_CATALOG_FILE: catalogFile,
  MONOLITH_ADDON_ADMIN_IDS: owner
})
await fs.writeFile(
  path.join(root, '.temp/shop-download-fixture.json'),
  JSON.stringify({ owner, stateRoot })
)
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  const release = catalog.releases.find(
    (entry: { url: string }) => entry.url === url
  )
  if (!release) return originalFetch(input, init)
  const bytes = await fs.readFile(
    path.join(
      path.dirname(catalogFile),
      new URL(url).pathname.split('/').at(-1)!
    )
  )
  let offset = 0
  return new Response(
    new ReadableStream({
      async pull(controller) {
        await new Promise(resolve => setTimeout(resolve, 150))
        if (offset >= bytes.length) {
          controller.close()
          return
        }
        const end = Math.min(offset + 131072, bytes.length)
        controller.enqueue(bytes.subarray(offset, end))
        offset = end
      }
    }),
    { headers: { 'content-length': String(bytes.length) } }
  )
}
await import('../../apps/api/src/index.ts')
