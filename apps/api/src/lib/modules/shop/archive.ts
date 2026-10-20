import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { z } from 'zod'

import type { AddonRelease } from '@monolith/configs'

export const digest = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex')
const archiveSchema = z.object({
  format: z.literal(1),
  id: z.string(),
  version: z.string(),
  hostVersion: z.string(),
  files: z
    .array(z.object({ path: z.string(), data: z.string() }))
    .min(3)
    .max(10000)
})

export function safePackagePath(file: string): boolean {
  if (file.length > 240 || !/^[a-zA-Z0-9_./@-]+$/.test(file)) return false
  if (
    file
      .split('/')
      .some(
        part =>
          !part ||
          part.startsWith('.') ||
          /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part)
      )
  )
    return false
  return (
    /^(package\.json|LICENSE(?:\.md|\.txt)?|NOTICE\.md|README\.md|client\/dist\/.+|server\/dist\/.+|locales\/(en|ms|zh-CN|zh-TW)\.json)$/.test(
      file
    ) &&
    !/(^|\/)(node_modules|uploads)(\/|$)/.test(file) &&
    !/\.(pem|key|p12|map)$/i.test(file)
  )
}

/** Validate everything before writing any executable file. No extraction hooks or links. */
export function unpackAddon(bytes: Buffer, release: AddonRelease) {
  if (bytes.length !== release.bytes || digest(bytes) !== release.sha256)
    throw Error('Package integrity check failed')
  const archive = archiveSchema.parse(
    JSON.parse(
      gunzipSync(bytes, { maxOutputLength: 256 * 1024 * 1024 }).toString('utf8')
    )
  )
  if (
    archive.id !== release.id ||
    archive.version !== release.version ||
    archive.hostVersion !== release.hostVersion
  )
    throw Error('Package identity does not match the catalog')
  const names = new Set<string>()
  const files = archive.files.map(file => {
    const name = file.path.toLowerCase()
    if (!safePackagePath(file.path) || names.has(name))
      throw Error('Invalid or duplicate package path')
    names.add(name)
    const data = Buffer.from(file.data, 'base64')
    if (data.toString('base64') !== file.data)
      throw Error('Invalid package encoding')
    return { path: file.path, data }
  })
  const read = (name: string) => files.find(file => file.path === name)?.data
  const pkg = JSON.parse(read('package.json')?.toString() ?? 'null')
  const manifest = JSON.parse(
    read('client/dist/monolith-manifest.json')?.toString() ?? 'null'
  )
  if (
    pkg?.monolith?.id !== release.id ||
    pkg?.version !== release.version ||
    pkg?.type !== 'module' ||
    pkg.scripts ||
    pkg.dependencies
  )
    throw Error('Invalid runtime package manifest')
  if (
    manifest?.package?.name !== pkg.name ||
    manifest?.package?.version !== pkg.version ||
    manifest?.package?.monolith?.id !== release.id ||
    !read('client/dist/remoteEntry.js')
  )
    throw Error('Invalid client manifest')
  if (manifest.hasServer && !read('server/dist/index.js'))
    throw Error('Missing server bundle')
  const schema = read('server/dist/schema.js')
  if ((schema ? digest(schema) : null) !== release.schemaHash)
    throw Error('Schema fingerprint mismatch')
  return files
}
