import type { Request } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  decodeFormValue,
  parseRequestInput
} from '../core/functions/routes/requestInput'

vi.mock('@functions/encryption', () => ({
  decryptPayload: (value: unknown) => value
}))

describe('Monolith request decoding', () => {
  it('preserves semicolons in encoded values and native scalar types', () => {
    expect(decodeFormValue('__type:object;{"title":"a;b"}')).toEqual({
      title: 'a;b'
    })
    expect(decodeFormValue('__type:boolean;false')).toBe(false)
    expect(decodeFormValue('__type:array;[0,false,null]')).toEqual([
      0,
      false,
      null
    ])
    expect(decodeFormValue('plain;text')).toBe('plain;text')
    expect(decodeFormValue('__type:future;abc')).toBe('__type:future;abc')
    expect(() => decodeFormValue('__type:date;"invalid"')).toThrow(
      'Invalid multipart'
    )
  })

  it('validates queries, decodes the form and keeps uploaded files separate', () => {
    const file = { id: 'uploaded' }
    const req = {
      query: { page: '2' },
      body: { title: 'Inbox', enabled: '__type:boolean;false' },
      files: { photo: [file] },
      is: () => true
    } as unknown as Request
    parseRequestInput(req, {
      encrypted: false,
      media: { photo: { optional: false, multiple: false } },
      schema: {
        query: z.object({ page: z.coerce.number() }),
        body: z.object({ title: z.string(), enabled: z.boolean() })
      }
    })
    expect(req.query).toEqual({ page: 2 })
    expect(req.body).toEqual({ title: 'Inbox', enabled: false })
    expect(req.media).toEqual({ photo: file })
  })

  it('rejects empty required uploads and invalid query input', () => {
    const req = {
      query: {},
      body: {},
      files: {},
      is: () => false
    } as unknown as Request
    expect(() =>
      parseRequestInput(req, {
        encrypted: false,
        media: { photos: { optional: false, multiple: true } },
        schema: {}
      })
    ).toThrow('Missing required')
    expect(() =>
      parseRequestInput(req, {
        encrypted: false,
        media: null,
        schema: { query: z.object({ id: z.uuid() }) }
      })
    ).toThrow()
  })
})
