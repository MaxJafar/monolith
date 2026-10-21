// SPDX-License-Identifier: 0BSD
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = dirname(fileURLToPath(import.meta.url))
const workspace = resolve(project, '../..')
config({ path: resolve(workspace, 'env/.env.local'), quiet: true })
const addons = resolve(workspace, 'modules')
const schemas: string[] = [
  resolve(project, 'src/lib/**/schema.drizzle.ts'),
  resolve(
    workspace,
    'packages/file-storage/src/server/metadata/schema.drizzle.ts'
  )
]
if (existsSync(addons)) {
  for (const item of readdirSync(addons, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue
    const location = resolve(addons, item.name, 'server')
    const selected = ['schema.drizzle.ts', 'dist/schema.js']
      .map(file => resolve(location, file))
      .find(existsSync)
    if (selected) schemas.push(selected)
  }
}
export default defineConfig({
  dialect: 'postgresql',
  out: resolve(project, 'drizzle'),
  schema: schemas,
  dbCredentials: { url: process.env.DATABASE_URL! }
})
