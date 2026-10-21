// SPDX-License-Identifier: 0BSD
import { create as disposition } from 'content-disposition'
import { basename } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'

import { generateThumbKey } from '@monolith/file-storage'
import { defineRoutes } from '@monolith/server-utils'

import { storageProvider } from '@/core/storage'

import endpoints from './endpoints'

const get = endpoints
  .query({
    description: 'Stream a file owned by the signed-in account',
    encrypted: false,
    rateLimit: false,
    input: {
      query: z.object({
        key: z.string().min(1),
        thumb: z.string().optional(),
        download: z.string().optional()
      })
    },
    output: 'custom'
  })
  .callback(async ({ db, query, res }) => {
    // The scoped database query must succeed before touching object storage.
    const metadata = await db.query.files.findFirst({
      where: { key: query.key }
    })
    const missing = () => res.status(404).json({ error: 'File not found' })
    if (!metadata) {
      missing()
      return
    }
    const address = query.thumb
      ? generateThumbKey(query.key, query.thumb)
      : query.key
    const object = await storageProvider.get(address)
    if (!object) {
      missing()
      return
    }
    const attachment = query.download === 'true'
    res.set({
      'Content-Type': object.mimeType,
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': disposition(
        attachment ? metadata.originalName : basename(address),
        { type: attachment ? 'attachment' : 'inline' }
      )
    })
    if (object.size > 0) res.set('Content-Length', String(object.size))
    // Finish the ownership transaction before streaming a potentially large file.
    // pipeline owns IO cleanup, including cancellation when the browser disconnects.
    void pipeline(object.stream, res).catch(error => {
      if (!res.destroyed) res.destroy(error)
    })
  })
export default defineRoutes({ get })
