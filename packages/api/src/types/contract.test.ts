// SPDX-License-Identifier: 0BSD
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { createApiClient } from '../proxy/createApiClient'
import type {
  InferContractInput,
  InferContractOutput,
  OmitIndexSignature
} from './contract'
import { GetGoogleFontResponseSchema } from './fonts'
import type { InferInput, InferOutput } from './socket'

describe('contract type compatibility', () => {
  it('keeps declared fields while removing unconstrained index signatures', () => {
    type Value = OmitIndexSignature<{
      [name: string]: unknown
      title: string
      nested: { [name: string]: unknown; count: number }
    }>
    expectTypeOf<Value>().toEqualTypeOf<{
      title: string
      nested: { count: number }
    }>()
    expectTypeOf<OmitIndexSignature<Record<string, number>>>().toEqualTypeOf<
      Record<string, number>
    >()
    expectTypeOf<OmitIndexSignature<string[]>>().toEqualTypeOf<string[]>()
  })
  it('derives request fields, successful responses and uploaded files', () => {
    const routes = {
      entries: {
        save: {
          method: 'post',
          input: {
            query: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id'],
              additionalProperties: false
            },
            body: {
              type: 'object',
              properties: { title: { type: 'string' } },
              required: ['title'],
              additionalProperties: false
            }
          },
          output: {
            CREATED: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id'],
              additionalProperties: false
            },
            NO_CONTENT: true
          },
          media: { cover: { optional: true }, files: { multiple: true } }
        }
      }
    } as const
    const client = createApiClient(routes)
    type Input = InferInput<typeof client.entries.save>
    expectTypeOf<Input['query']>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<Input['body']['title']>().toEqualTypeOf<string>()
    expectTypeOf<Input['body']['cover']>().toEqualTypeOf<
      File | string | undefined
    >()
    expectTypeOf<Input['body']['files']>().toEqualTypeOf<File[]>()
    expectTypeOf<InferOutput<typeof client.entries.save>>().toEqualTypeOf<{
      id: string
    } | void>()
    expectTypeOf<InferContractInput<{}>>().toEqualTypeOf<{
      body: undefined
      query: undefined
    }>()
    expectTypeOf<InferContractOutput<{ output: 'custom' }>>().toBeAny()
    const schema = z.object({ count: z.number().default(0) })
    expectTypeOf<
      InferContractInput<{ input: { body: typeof schema } }>['body']
    >().toEqualTypeOf<typeof schema>()
  })
  it('accepts disabled fonts and preserves provider variant names', () => {
    expect(GetGoogleFontResponseSchema.parse({ enabled: false })).toEqual({
      enabled: false
    })
    const font = {
      kind: 'webfonts#webfont',
      family: 'Fixture',
      category: 'sans-serif',
      variants: ['regular'],
      subsets: ['latin'],
      files: {
        regular: 'https://example.invalid/font.woff2',
        '400': 'https://example.invalid/weight.woff2'
      },
      menu: 'https://example.invalid/menu.woff2',
      version: 'v1',
      lastModified: '2026-10-21'
    }
    expect(
      GetGoogleFontResponseSchema.parse({ enabled: true, items: [font] })
        .items?.[0]?.files['400']
    ).toBe(font.files['400'])
  })
})
