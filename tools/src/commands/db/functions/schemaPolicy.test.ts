// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { schemaStatements } from './pushSchema'

it('keeps additive definitions and routes checks through canonical reconciliation', () => {
  const create = 'CREATE TABLE "work" ("id" uuid);'
  const add = 'ALTER TABLE "work" ADD COLUMN "title" text;'
  expect(
    schemaStatements([
      create,
      add,
      'ALTER TABLE "work" ADD CONSTRAINT "ok" CHECK (length(title) > 0);',
      'DROP TABLE "old";',
      'ALTER TABLE "work" DROP COLUMN "id";',
      'TRUNCATE "work";'
    ])
  ).toEqual([create, add])
})
