// SPDX-License-Identifier: 0BSD
import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { integer, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { composeRelations } from './composeRelations'
import { defineModuleSchema } from './defineModuleSchema'
import { proxyDbQuery, scopeDbForModule } from './proxyDbQuery'

const projects = pgTable('workspace__projects', {
  id: integer().primaryKey(),
  title: text()
})
const actions = pgTable('workspace__actions', {
  id: integer().primaryKey(),
  title: text(),
  project: integer()
})
const sessions = pgTable('focus__sessions', {
  id: integer().primaryKey(),
  minutes: integer()
})
const work = defineModuleSchema(
  { projects, actions },
  r => ({
    actions: {
      linkedProject: r.one.projects({
        from: r.actions.project,
        to: r.projects.id
      })
    },
    projects: { actions: r.many.actions() }
  }),
  'monolith--work'
)
const focus = defineModuleSchema({ sessions }, () => ({}), 'monolith--focus')

describe('database scope with persisted records', () => {
  let client: PGlite
  let db: any
  beforeAll(async () => {
    client = new PGlite()
    await client.exec(`
      CREATE TABLE workspace__projects (id integer PRIMARY KEY, title text);
      CREATE TABLE workspace__actions (id integer PRIMARY KEY, title text, project integer REFERENCES workspace__projects(id));
      CREATE TABLE focus__sessions (id integer PRIMARY KEY, minutes integer);
      INSERT INTO workspace__projects VALUES (10, 'Release');
      INSERT INTO workspace__actions VALUES (20, 'Verify data', 10);
      INSERT INTO focus__sessions VALUES (30, 25);
    `)
    db = drizzle({ client, relations: composeRelations([work, focus]) })
  })
  afterAll(async () => {
    await client?.close()
  })

  it('reads existing relations through local keys and uses ordinary database methods', async () => {
    const scoped = scopeDbForModule(db, work.keyMap)
    const rows = await scoped.query.projects.findMany({
      with: { actions: true }
    })
    expect(rows).toMatchObject([
      { title: 'Release', actions: [{ title: 'Verify data', project: 10 }] }
    ])
    expect(await scoped.select().from(actions)).toHaveLength(1)
    expect(scoped.query.sessions).toBeUndefined()
  })

  it('keeps transaction queries scoped and rolls back rejected writes', async () => {
    const scoped = scopeDbForModule(db, work.keyMap)
    await expect(
      scoped.transaction(async (tx: any) => {
        const current = await tx.query.actions.findFirst({
          where: { id: 20 },
          with: { linkedProject: true }
        })
        expect(current.linkedProject.title).toBe('Release')
        await tx
          .update(actions)
          .set({ title: 'Temporary' })
          .where(eq(actions.id, 20))
        throw Error('Cancel transaction')
      })
    ).rejects.toThrow('Cancel transaction')
    expect((await scoped.query.actions.findFirst()).title).toBe('Verify data')
    await scoped.transaction(async (tx: any) => {
      await tx
        .update(actions)
        .set({ title: 'Verified' })
        .where(eq(actions.id, 20))
    })
    expect((await scoped.query.actions.findFirst()).title).toBe('Verified')
  })

  it('rebinds an existing facade to a different add-on without retaining old aliases', async () => {
    const scoped = scopeDbForModule(db, work.keyMap)
    const other = scopeDbForModule(scoped, focus.keyMap)
    expect(await other.query.sessions.findMany()).toEqual([
      { id: 30, minutes: 25 }
    ])
    expect(other.query.actions).toBeUndefined()
    expect(scopeDbForModule(db, undefined)).toBe(db)
  })

  it('refreshes a query facade when its underlying query object changes', () => {
    const source = {
      query: { persisted: 1 },
      value() {
        return this.query.persisted
      }
    }
    const scoped = proxyDbQuery(source, {
      local: 'persisted'
    }) as typeof source & { query: { local: number } }
    expect(scoped.query.local).toBe(1)
    source.query = { persisted: 2 }
    expect(scoped.query.local).toBe(2)
    expect(scoped.value()).toBe(2)
  })
})
