// SPDX-License-Identifier: 0BSD
import { PGlite } from '@electric-sql/pglite'
import { integer, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { checkRecordExistence } from './checkRecordExistence'
import { existsIn } from './existsIn'
import { mapDatabaseError } from './mapDatabaseError'

const projects = pgTable('monolith_projects_fixture', {
  id: integer().primaryKey(),
  name: text().unique()
})
const actions = pgTable('monolith_actions_fixture', {
  id: integer().primaryKey(),
  project: integer().references(() => projects.id)
})
let client: PGlite, db: ReturnType<typeof drizzle>
beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    create table monolith_projects_fixture(id integer primary key, name text unique);
    create table monolith_actions_fixture(id integer primary key, project integer references monolith_projects_fixture(id));
    insert into monolith_projects_fixture select n, 'Project ' || n from generate_series(1,1050) n;
  `)
  db = drizzle({ client })
})
afterAll(async () => {
  await client.close()
})
afterEach(() => vi.restoreAllMocks())
const validate = (
  options: Omit<Parameters<typeof checkRecordExistence>[0], 'db'>
) => checkRecordExistence({ ...options, db: db as never })

it('batches a large reference set and deduplicates across body and query', async () => {
  const select = vi.spyOn(db, 'select')
  await validate({
    bodySchema: z.object({ projects: existsIn(z.array(z.number()), projects) }),
    body: { projects: Array.from({ length: 1050 }, (_, index) => index + 1) },
    querySchema: z.object({ project: existsIn(z.number(), projects) }),
    query: { project: 1 }
  })
  expect(select).toHaveBeenCalledTimes(2)
})
it('returns all relevant field paths for a missing row', async () => {
  await expect(
    validate({
      bodySchema: z.object({
        projects: existsIn(z.array(z.number()), projects)
      }),
      body: { projects: [1, 9999, 9999] },
      querySchema: z.object({ project: existsIn(z.number(), projects) }),
      query: { project: 9999 }
    })
  ).rejects.toMatchObject({
    code: 404,
    message: expect.stringContaining('query.project, body.projects')
  })
})
it('resolves custom columns and skips optional references without running a query', async () => {
  await validate({
    bodySchema: z.object({ name: existsIn(z.string(), projects, 'name') }),
    body: { name: 'Project 2' }
  })
  const select = vi.spyOn(db, 'select')
  await validate({
    bodySchema: z.object({ id: existsIn(z.number(), projects).optional() }),
    body: {}
  })
  expect(select).not.toHaveBeenCalled()
})
it('rejects invalid annotation columns before issuing SQL', async () => {
  const select = vi.spyOn(db, 'select')
  await expect(
    validate({
      bodySchema: existsIn(z.string(), projects, 'missing' as never),
      body: 'x'
    })
  ).rejects.toThrow('unknown column missing')
  const noKey = pgTable('fixture_without_key', { value: text() })
  await expect(
    validate({ bodySchema: existsIn(z.string(), noKey), body: 'x' })
  ).rejects.toThrow('no primary key')
  expect(select).not.toHaveBeenCalled()
})
it('maps actual PostgreSQL unique and foreign-key failures through the driver cause', async () => {
  const duplicate = await db
    .insert(projects)
    .values({ id: 2000, name: 'Project 1' })
    .catch(error => error)
  expect(mapDatabaseError(duplicate)).toMatchObject({
    code: 409,
    message: expect.stringContaining('name')
  })
  const orphan = await db
    .insert(actions)
    .values({ id: 1, project: 9999 })
    .catch(error => error)
  expect(mapDatabaseError(orphan)).toMatchObject({
    code: 404,
    message: expect.stringContaining('monolith_projects_fixture')
  })
})
