import dotenv from 'dotenv'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

import { ROOT_DIR } from '../utils/constants'

// One-time, local migration after addon folders acquire their canonical names.
// Stop the API first. Default is a read-only plan; --apply moves files and references.
dotenv.config({ path: path.join(ROOT_DIR, 'env/.env.local'), quiet: true })
const connection = new URL(process.env.DATABASE_ADMIN_URL || '')
if (
  !['localhost', '127.0.0.1'].includes(connection.hostname) ||
  connection.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(connection.pathname) ||
  process.env.NODE_ENV === 'production'
)
  throw Error(
    'This migration only manages the isolated local development database'
  )
if (
  process.env.FILE_STORAGE_PROVIDER &&
  process.env.FILE_STORAGE_PROVIDER !== 'local'
)
  throw Error('Use a provider-specific migration for remote storage')
const root = realpathSync(
  process.env.FILE_STORAGE_LOCAL_PATH || path.join(ROOT_DIR, 'storage')
)
const identities = JSON.parse(
  readFileSync(
    path.join(ROOT_DIR, 'packages/configs/src/compatibility/addons.json'),
    'utf8'
  )
) as { id: string; name: string }[]
const db = postgres(connection.href, { max: 1 })
const apply = process.argv.includes('--apply')
const moved: { oldPath: string; newPath: string }[] = []
const inside = (value: string) => {
  const target = path.resolve(root, value)
  if (
    !target.startsWith(root + path.sep) ||
    value.includes('..') ||
    path.isAbsolute(value)
  )
    throw Error('Storage path escapes the configured root')
  return target
}
const quote = (identifier: string) =>
  '"' + identifier.replaceAll('"', '""') + '"'
async function main() {
  try {
    const files = await db`select * from files`
    const prefixes = new Map<string, string>(),
      keys = new Map<string, string>()
    for (const file of files) {
      const current = identities.find(
        entry =>
          entry.id === file.module_id ||
          entry.name.split('/').pop() ===
            String(file.module_id).split('--').pop()
      )
      if (!current || current.id === file.module_id) continue
      if (
        !/^[a-z0-9-]+$/i.test(file.module_id) ||
        !String(file.key).startsWith(file.module_id + '/')
      )
        throw Error('Unexpected file module identity')
      prefixes.set(file.module_id, current.id)
      for (const key of [
        file.key,
        ...(file.thumbs ?? []).map((thumb: { key: string }) => thumb.key)
      ]) {
        const next = current.id + key.slice(String(file.module_id).length)
        inside(key)
        inside(next)
        keys.set(key, next)
      }
    }
    console.info(
      `${apply ? 'Applying' : 'Plan'}: ${prefixes.size} storage folders, ${keys.size} media references`
    )
    if (apply && keys.size) {
      for (const [before, after] of prefixes) {
        const oldPath = inside(before),
          newPath = inside(after)
        if (
          !existsSync(oldPath) ||
          realpathSync(oldPath) !== oldPath ||
          existsSync(newPath)
        )
          throw Error(
            'Expected a local source folder and an unused destination'
          )
      }
      const backup = path.join(
        ROOT_DIR,
        '.temp',
        'addon-storage-' + Date.now() + '.json'
      )
      mkdirSync(path.dirname(backup), { recursive: true })
      writeFileSync(
        backup,
        JSON.stringify(
          {
            prefixes: [...prefixes],
            files: files.filter(file => prefixes.has(file.module_id))
          },
          null,
          2
        ),
        { mode: 0o600 }
      )
      await db.begin(async tx => {
        await tx`lock table files in access exclusive mode`
        const columns =
          await tx`select table_name,column_name,data_type from information_schema.columns where table_schema='public' and data_type in ('text','character varying','json','jsonb')`
        const allKeys = [...keys],
          jsonPairs = allKeys.flatMap(([before, after]) => [
            JSON.stringify(before),
            JSON.stringify(after)
          ])
        for (const column of columns) {
          const table = quote(column.table_name),
            field = quote(column.column_name)
          if (['json', 'jsonb'].includes(column.data_type)) {
            let expression = field + '::text'
            for (let i = 0; i < jsonPairs.length; i += 2)
              expression = `replace(${expression},$${i + 1},$${i + 2})`
            await tx.unsafe(
              `update ${table} set ${field}=(${expression})::${column.data_type} where ${field} is not null and ${field}::text like any($${jsonPairs.length + 1}::text[])`,
              [
                ...jsonPairs,
                [...prefixes.keys()].map(prefix => '%' + prefix + '/%')
              ]
            )
          } else {
            const pairs =
              column.table_name === 'files' &&
              column.column_name === 'module_id'
                ? [...prefixes]
                : allKeys
            const values = pairs.flat(),
              clauses = pairs
                .map(
                  (_, index) => `when $${index * 2 + 1} then $${index * 2 + 2}`
                )
                .join(' ')
            await tx.unsafe(
              `update ${table} set ${field}=case ${field} ${clauses} else ${field} end where ${field}=any($${values.length + 1}::text[])`,
              [...values, pairs.map(pair => pair[0])]
            )
          }
        }
        for (const [before, after] of prefixes) {
          const oldPath = inside(before),
            newPath = inside(after)
          renameSync(oldPath, newPath)
          moved.push({ oldPath, newPath })
        }
      })
      console.info(
        'Storage folders and database references migrated together. Recovery metadata is in the private .temp directory.'
      )
    }
  } catch (error) {
    for (const move of moved.reverse()) {
      if (existsSync(move.newPath) && !existsSync(move.oldPath))
        renameSync(move.newPath, move.oldPath)
    }
    throw error
  } finally {
    await db.end()
  }
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
