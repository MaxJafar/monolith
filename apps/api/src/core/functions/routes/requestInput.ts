import { decryptPayload } from '@functions/encryption'
import type { Request } from 'express'
import { z } from 'zod'

import type { StagedFile } from '@monolith/file-storage'
import { ClientError, type MediaConfig } from '@monolith/server-utils'

const tags = new Set(['array', 'boolean', 'date', 'number', 'object'])

/** Read the versioned multipart scalar representation used by installed clients. */
export function decodeFormValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value === 'undefined') return undefined
  const marker = /^__type:([^;]+);/.exec(value)
  if (!marker || !tags.has(marker[1]!)) return value
  try {
    const decoded: unknown = JSON.parse(value.slice(marker[0].length))
    if (marker[1] !== 'date') return decoded
    if (typeof decoded !== 'string') throw new Error('Invalid date')
    const date = new Date(decoded)
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid date')
    return date
  } catch {
    throw new ClientError('Invalid multipart field encoding', 400)
  }
}

function validate(value: unknown, schema?: z.ZodTypeAny): any {
  if (!schema) return value
  const result = schema.safeParse(value)
  if (result.success) return result.data
  throw new ClientError(JSON.stringify(z.formatError(result.error)), 400)
}

export function parseRequestInput(
  request: Request,
  config: {
    encrypted: boolean
    media: MediaConfig | null
    schema: { query?: z.ZodTypeAny; body?: z.ZodTypeAny }
  }
): void {
  request.query = validate(request.query, config.schema.query)
  const payload = config.encrypted ? decryptPayload(request.body) : request.body
  const fields = payload && typeof payload === 'object' ? payload : {}
  const form = Boolean(request.is('multipart/form-data'))
  const body: Record<string, unknown> = {}
  const media: Record<string, unknown> = {}
  const uploads = (request.files ?? {}) as unknown as Record<
    string,
    StagedFile[]
  >

  for (const [name, value] of Object.entries(fields)) {
    if (Object.hasOwn(config.media ?? {}, name)) media[name] = value
    else body[name] = form ? decodeFormValue(value) : value
  }
  for (const [name, field] of Object.entries(config.media ?? {})) {
    const files = uploads[name]
    if (files?.length) media[name] = field.multiple ? files : files[0]
    const value = media[name]
    const absent =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    if (absent && !field.optional)
      throw new ClientError(`Missing required media field "${name}"`, 400)
    if (absent) media[name] = field.multiple ? [] : undefined
  }
  request.body = validate(body, config.schema.body)
  request.media = media as Request['media']
}
