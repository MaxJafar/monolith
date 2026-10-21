// SPDX-License-Identifier: 0BSD
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { createFileMetadataStore } from './store'

let database: PGlite, store: ReturnType<typeof createFileMetadataStore>
beforeAll(async () => {
  database = new PGlite()
  await database.exec(`
    create table files(
      key varchar(512) primary key, original_name varchar(512) not null,
      mime_type varchar(255) not null, size integer not null, thumbs jsonb not null default '[]',
      module_id varchar(255) not null, created timestamp not null default now()
    );
    insert into files(key, original_name, mime_type, size, module_id)
    values('notes/existing.txt','existing.txt','text/plain',4,'notes');
  `)
  store = createFileMetadataStore(drizzle({ client: database }) as never)
})
afterAll(async () => {
  await database.close()
})
it('reads the installed table shape without exposing internal timestamps', async () => {
  expect(await store.get('notes/existing.txt')).toEqual({
    key: 'notes/existing.txt',
    originalName: 'existing.txt',
    mimeType: 'text/plain',
    size: 4,
    moduleId: 'notes',
    thumbs: []
  })
})
it('updates preview metadata without changing the original creation time', async () => {
  const before = await database.query(
    'select created from files where key=$1',
    ['notes/existing.txt']
  )
  const existing = (await store.get('notes/existing.txt'))!
  const updated = {
    ...existing,
    size: 32,
    thumbs: [
      { key: 'notes/existing-thumb-8x8.png', size: '8x8', width: 8, height: 8 }
    ]
  }
  await store.upsert(updated)
  expect(await store.get(existing.key)).toEqual(updated)
  expect(
    (
      await database.query('select created from files where key=$1', [
        existing.key
      ])
    ).rows
  ).toEqual(before.rows)
})
it('deletes only the requested metadata and safely handles absent objects', async () => {
  await store.upsert({
    key: 'wallet/other.txt',
    moduleId: 'wallet',
    originalName: 'other.txt',
    mimeType: 'text/plain',
    size: 1,
    thumbs: []
  })
  await store.delete('wallet/other.txt')
  expect(await store.get('wallet/other.txt')).toBeNull()
  expect(await store.get('notes/existing.txt')).not.toBeNull()
  await store.delete('notes/missing.txt')
})
