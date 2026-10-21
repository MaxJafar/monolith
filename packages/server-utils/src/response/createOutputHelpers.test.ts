// SPDX-License-Identifier: 0BSD
import { expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import {
  ClientError,
  createOutputHelpers,
  getStatusMessage,
  isSuccessOutputKey
} from './index'
import type { ResponseObject } from './types'

it('only offers declared success responses and always exposes standard failures', () => {
  const api = createOutputHelpers({
    CREATED: z.object({ id: z.number() }),
    NO_CONTENT: true
  })
  expect(Object.keys(api).sort()).toEqual(
    [
      'created',
      'noContent',
      'badRequest',
      'unauthorized',
      'forbidden',
      'notFound',
      'conflict'
    ].sort()
  )
  expect(api.created({ id: 12 })).toEqual({ $status: 201, payload: { id: 12 } })
  expect(api.noContent()).toEqual({ $status: 204 })
  expect(api.badRequest('Invalid date')).toEqual({
    $status: 400,
    payload: 'Invalid date'
  })
  expect(api.conflict()).toEqual({ $status: 409 })
  expect(api.forbidden()).toEqual({ $status: 403 })
  expect(api.unauthorized()).toEqual({ $status: 401 })
  expect(api.notFound()).toEqual({ $status: 404 })
})
it('does not adopt inherited or unknown declarations, and leaves custom routes alone', () => {
  const definitions = Object.assign(Object.create({ OK: z.string() }), {
    surprise: true
  })
  expect(createOutputHelpers(definitions)).not.toHaveProperty('ok')
  expect(createOutputHelpers('custom')).toEqual({})
  expect(isSuccessOutputKey('toString')).toBe(false)
  expect(isSuccessOutputKey('BAD_REQUEST')).toBe(false)
  expect(isSuccessOutputKey('ACCEPTED')).toBe(true)
  expect(getStatusMessage(204)).toBe('No Content')
  expect(getStatusMessage(999)).toBe('Error')
})
it('keeps payload inference and error classification compatible with route callbacks', () => {
  const definition = { OK: z.object({ done: z.boolean() }) }
  const api = createOutputHelpers(definition)
  expectTypeOf(api.ok).parameter(0).toEqualTypeOf<{ done: boolean }>()
  const value: ResponseObject<typeof definition> = api.ok({ done: true })
  expect(value.payload).toEqual({ done: true })
  const failure = new ClientError('Missing', 404)
  expect(ClientError.isClientError(failure)).toBe(true)
  expect(ClientError.isClientError({ name: 'ClientError', code: 404 })).toBe(
    false
  )
  expect(failure).toBeInstanceOf(Error)
})
