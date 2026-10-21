// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { mapDatabaseError } from './mapDatabaseError'

it('recognizes nested constraint errors without disclosing values or SQL', () => {
  const detail = 'Key (email)=(private@example.test) already exists.'
  const failure = mapDatabaseError({
    query: 'secret SQL',
    cause: { cause: { code: '23505', detail } }
  })
  expect(failure).toMatchObject({
    code: 409,
    message: 'Duplicate value for "email"'
  })
  expect(failure?.message).not.toContain('private')
})
it('reports missing references and supports drivers that omit detail', () => {
  expect(
    mapDatabaseError({
      code: '23503',
      detail: 'Key (project_id)=(42) is not present in table "projects".'
    })
  ).toMatchObject({
    code: 404,
    message: 'Related "projects" record not found (project_id)'
  })
  expect(mapDatabaseError({ code: '23503' })).toMatchObject({
    code: 404,
    message: 'Related record not found'
  })
  expect(mapDatabaseError({ code: '23505', detail: 12 })).toMatchObject({
    code: 409,
    message: 'Duplicate value'
  })
})
it('terminates cause cycles and leaves unrelated failures for normal error handling', () => {
  const cycle: any = { code: '08006' }
  cycle.cause = cycle
  expect(mapDatabaseError(cycle)).toBeNull()
  expect(mapDatabaseError(new Error('network unavailable'))).toBeNull()
  expect(mapDatabaseError(null)).toBeNull()
})
