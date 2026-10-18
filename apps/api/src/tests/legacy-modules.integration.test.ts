import dotenv from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import { createReadStream, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  FileStorage,
  type StagedFile,
  type StorageProvider,
  createProvider
} from '@monolith/file-storage'
import { createFileMetadataStore } from '@monolith/file-storage/server'
import type { EndpointContract } from '@monolith/server-utils'

import * as blogCategories from '../../../../modules/monolith--blog/server/routes/categories'
import * as blogEntries from '../../../../modules/monolith--blog/server/routes/entries'
import * as flashCards from '../../../../modules/monolith--flashcards/server/routes/cards'
import * as flashDecks from '../../../../modules/monolith--flashcards/server/routes/decks'
import * as flashTags from '../../../../modules/monolith--flashcards/server/routes/tags'
import * as noteEntries from '../../../../modules/monolith--notes/server/routes/entries'
import * as noteSubjects from '../../../../modules/monolith--notes/server/routes/subjects'
import * as noteWorkspaces from '../../../../modules/monolith--notes/server/routes/workspaces'
import * as projectCategories from '../../../../modules/monolith--projects/server/routes/categories'
import * as projectColumns from '../../../../modules/monolith--projects/server/routes/columns'
import * as projectEntries from '../../../../modules/monolith--projects/server/routes/entries'
import * as projectStatuses from '../../../../modules/monolith--projects/server/routes/statuses'
import * as projectTasks from '../../../../modules/monolith--projects/server/routes/tasks'
import * as projectTechnologies from '../../../../modules/monolith--projects/server/routes/technologies'
import * as projectVisibilities from '../../../../modules/monolith--projects/server/routes/visibilities'
import * as wishEntries from '../../../../modules/monolith--wishlist/server/routes/entries'
import * as wishLists from '../../../../modules/monolith--wishlist/server/routes/lists'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..'
)
dotenv.config({
  path: path.join(root, 'env/.env.local'),
  quiet: true,
  override: true
})

const enabled = process.env.ZILLION_INTEGRATION === '1'
const owner = randomUUID()
const stranger = randomUUID()

let connection: ReturnType<typeof postgres> | undefined
let admin: ReturnType<typeof postgres> | undefined
let db: ReturnType<typeof drizzle>
let provider: StorageProvider
let storageDirectory: string

type CrudRoutes = {
  list: EndpointContract
  create: EndpointContract
  update: EndpointContract
  remove: EndpointContract
}
type Result = { $status: number; payload?: unknown }

async function call(
  route: EndpointContract,
  body?: unknown,
  query?: unknown,
  user = owner,
  media: Record<string, StagedFile> = {}
): Promise<Result> {
  const value = route.getValue()
  const parsedBody = value.schema.body?.parse(body)
  const parsedQuery = value.schema.query?.parse(query)

  return db.transaction(async transaction => {
    await transaction.execute(
      sql`select set_config('zillion.user_id', ${user}, true)`
    )
    const storage = new FileStorage(
      provider,
      createFileMetadataStore(transaction),
      'monolith--notes'
    )

    return value.callback({
      db: transaction,
      res: { locals: { userId: user } },
      req: {},
      io: {},
      core: { storage },
      media,
      body: parsedBody,
      query: parsedQuery
    } as never)
  })
}

function records(result: Result): Record<string, unknown>[] {
  expect(result.$status).toBe(200)
  expect(Array.isArray(result.payload)).toBe(true)

  return result.payload as Record<string, unknown>[]
}

async function create(
  route: EndpointContract,
  body: unknown,
  user = owner
): Promise<string> {
  const result = await call(route, body, undefined, user)
  expect(result.$status).toBe(201)
  const record = result.payload as { id: string; owner_id?: string }
  expect(record.owner_id).toBeUndefined()
  expect(record.id).toMatch(/^[0-9a-f-]{36}$/)

  return record.id
}

async function verifyCrud(routes: CrudRoutes, body: Record<string, unknown>) {
  const id = await create(routes.create, body)
  expect(
    records(await call(routes.list)).some(record => record.id === id)
  ).toBe(true)
  expect(
    records(await call(routes.list, undefined, undefined, stranger)).some(
      record => record.id === id
    )
  ).toBe(false)
  expect((await call(routes.update, body, { id }, stranger)).$status).toBe(404)
  expect((await call(routes.remove, undefined, { id }, stranger)).$status).toBe(
    404
  )
  const titleKey =
    'name' in body ? 'name' : 'title' in body ? 'title' : 'question'
  const updated = { ...body, [titleKey]: 'Updated integration fixture' }
  expect((await call(routes.update, updated, { id })).$status).toBe(204)
  expect(
    records(await call(routes.list)).find(record => record.id === id)?.[
      titleKey
    ]
  ).toBe('Updated integration fixture')
  expect((await call(routes.remove, undefined, { id })).$status).toBe(204)
  expect(
    records(await call(routes.list)).some(record => record.id === id)
  ).toBe(false)
}

describe.skipIf(!enabled)(
  'five modernized legacy modules with PostgreSQL and owner RLS',
  () => {
    beforeAll(async () => {
      if (!process.env.DATABASE_URL || !process.env.DATABASE_ADMIN_URL)
        throw new Error('Local test database URLs are required')

      for (const value of [
        process.env.DATABASE_URL,
        process.env.DATABASE_ADMIN_URL
      ]) {
        const target = new URL(value)

        if (
          !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
          !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
        )
          throw new Error(
            'Integration tests only use isolated local Monolith databases'
          )
      }
      connection = postgres(process.env.DATABASE_URL, { max: 2 })
      admin = postgres(process.env.DATABASE_ADMIN_URL, { max: 1 })
      db = drizzle({ client: connection })
      storageDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'zillion-notes-storage-')
      )
      const previousPath = process.env.FILE_STORAGE_LOCAL_PATH
      const previousProvider = process.env.FILE_STORAGE_PROVIDER
      process.env.FILE_STORAGE_LOCAL_PATH = storageDirectory
      process.env.FILE_STORAGE_PROVIDER = 'local'
      provider = createProvider()
      if (previousPath === undefined) delete process.env.FILE_STORAGE_LOCAL_PATH
      else process.env.FILE_STORAGE_LOCAL_PATH = previousPath
      if (previousProvider === undefined)
        delete process.env.FILE_STORAGE_PROVIDER
      else process.env.FILE_STORAGE_PROVIDER = previousProvider
      await admin`insert into users (id, email, username) values (${owner}, ${owner + '@synthetic.invalid'}, ${owner}), (${stranger}, ${stranger + '@synthetic.invalid'}, ${stranger})`
    })
    afterAll(async () => {
      if (admin) {
        const tables =
          await admin`select tablename from pg_tables where schemaname = 'public' and (tablename like 'blog__%' or tablename like 'projects__%' or tablename like 'notes__%' or tablename like 'flashcards__%' or tablename like 'wishlist__%')`

        for (const row of tables)
          await admin.unsafe(
            `delete from "${String(row.tablename).replaceAll('"', '""')}" where owner_id in ($1, $2)`,
            [owner, stranger]
          )
        await admin`delete from files where owner_id in (${owner}, ${stranger})`
        await admin`delete from users where id in (${owner}, ${stranger})`
        await admin.end()
      }
      if (connection) await connection.end()
      if (storageDirectory)
        await fs.rm(storageDirectory, { recursive: true, force: true })
    })

    it('creates, edits, isolates and deletes all blog entities; optional category deletion retains content', async () => {
      const category = await create(blogCategories.create, {
        name: 'Blog category',
        color: '#f97316',
        icon: 'tabler:folder'
      })
      const body = {
        title: 'First post',
        content: '# Persisted Markdown',
        excerpt: 'Summary',
        visibility: 'private',
        category_id: category,
        labels: 'test',
        featured_image: ''
      }
      await verifyCrud(blogEntries, body)
      const foreignCategory = await create(
        blogCategories.create,
        { name: 'Foreign', color: '#f97316', icon: 'tabler:folder' },
        stranger
      )
      expect(
        (
          await call(blogEntries.create, {
            ...body,
            category_id: foreignCategory
          })
        ).$status
      ).toBe(404)
      const retained = await create(blogEntries.create, body)
      expect(
        (await call(blogCategories.remove, undefined, { id: category })).$status
      ).toBe(204)
      expect(
        records(await call(blogEntries.list)).find(
          record => record.id === retained
        )?.category_id
      ).toBe(null)
      await verifyCrud(blogCategories, {
        name: 'Category CRUD',
        color: '#f97316',
        icon: 'tabler:folder'
      })
    })

    it('persists project taxonomy, boards, card moves and cleans deleted technology references', async () => {
      const taxonomy = { name: 'Project taxonomy', icon: 'tabler:folder' }
      await verifyCrud(projectCategories, taxonomy)
      await verifyCrud(projectStatuses, { ...taxonomy, color: '#f97316' })
      await verifyCrud(projectVisibilities, taxonomy)
      await verifyCrud(projectTechnologies, taxonomy)
      const technology = await create(projectTechnologies.create, {
        ...taxonomy,
        name: 'TypeScript'
      })
      const projectBody = {
        name: 'Monolith module',
        description: 'Persistent board',
        icon: 'tabler:briefcase',
        color: '#f97316',
        category_id: null,
        status_id: null,
        visibility_id: null,
        technology_ids: [technology]
      }
      const project = await create(projectEntries.create, projectBody)
      await verifyCrud(projectEntries, { ...projectBody, name: 'Project CRUD' })
      await verifyCrud(projectColumns, {
        ...taxonomy,
        color: '#f97316',
        project_id: project
      })
      const firstColumn = await create(projectColumns.create, {
        ...taxonomy,
        name: 'Todo',
        color: '#f97316',
        project_id: project
      })
      const secondColumn = await create(projectColumns.create, {
        ...taxonomy,
        name: 'Done',
        color: '#f97316',
        project_id: project
      })
      const taskBody = {
        title: 'Move me',
        content: 'Details',
        completed: false,
        column_id: firstColumn
      }
      await verifyCrud(projectTasks, taskBody)
      const task = await create(projectTasks.create, taskBody)
      expect(
        (
          await call(
            projectTasks.update,
            { ...taskBody, column_id: secondColumn, completed: true },
            { id: task }
          )
        ).$status
      ).toBe(204)
      expect(
        records(await call(projectTasks.list)).find(
          record => record.id === task
        )?.column_id
      ).toBe(secondColumn)
      expect(
        (await call(projectTechnologies.remove, undefined, { id: technology }))
          .$status
      ).toBe(204)
      expect(
        records(await call(projectEntries.list)).find(
          record => record.id === project
        )?.technology_ids
      ).toEqual([])
      expect(
        (await call(projectEntries.remove, undefined, { id: project })).$status
      ).toBe(204)
      expect(
        records(await call(projectTasks.list)).some(
          record => record.id === task
        )
      ).toBe(false)
    })

    it('persists notes and rejects invalid ancestry, cycles, owner references and destructive folder type changes', async () => {
      await verifyCrud(noteWorkspaces, {
        name: 'Workspace CRUD',
        icon: 'tabler:folder'
      })
      const workspace = await create(noteWorkspaces.create, {
        name: 'Knowledge',
        icon: 'tabler:notebook'
      })
      const subjectBody = {
        title: 'Notes subject',
        description: '',
        icon: 'tabler:folder',
        workspace_id: workspace
      }
      await verifyCrud(noteSubjects, subjectBody)
      const subject = await create(noteSubjects.create, subjectBody)
      const noteBody = {
        name: 'Note',
        type: 'note',
        content: 'Persistent Markdown',
        subject_id: subject,
        parent_id: null
      }
      await verifyCrud(noteEntries, noteBody)
      const folder = await create(noteEntries.create, {
        ...noteBody,
        name: 'Folder',
        type: 'folder'
      })
      const nested = await create(noteEntries.create, {
        ...noteBody,
        name: 'Nested',
        type: 'folder',
        parent_id: folder
      })
      expect(
        (
          await call(
            noteEntries.update,
            { ...noteBody, name: 'Folder', type: 'folder', parent_id: nested },
            { id: folder }
          )
        ).$status
      ).toBe(400)
      expect(
        (
          await call(
            noteEntries.update,
            { ...noteBody, name: 'Folder', type: 'note' },
            { id: folder }
          )
        ).$status
      ).toBe(400)
      const wrongSubject = await create(noteSubjects.create, {
        ...subjectBody,
        title: 'Other subject'
      })
      expect(
        (
          await call(noteEntries.create, {
            ...noteBody,
            subject_id: wrongSubject,
            parent_id: folder
          })
        ).$status
      ).toBe(400)
      expect(
        (
          await call(
            noteEntries.create,
            { ...noteBody, parent_id: folder },
            undefined,
            stranger
          )
        ).$status
      ).toBe(404)
      const folderBody = { ...noteBody, type: 'folder' }
      const firstSibling = await create(noteEntries.create, {
        ...folderBody,
        name: 'Concurrent first'
      })
      const secondSibling = await create(noteEntries.create, {
        ...folderBody,
        name: 'Concurrent second'
      })
      const concurrentMoves = await Promise.all([
        call(
          noteEntries.update,
          { ...folderBody, parent_id: secondSibling },
          { id: firstSibling }
        ),
        call(
          noteEntries.update,
          { ...folderBody, parent_id: firstSibling },
          { id: secondSibling }
        )
      ])
      expect(concurrentMoves.map(result => result.$status).sort()).toEqual([
        204, 400
      ])
      expect(
        (await call(noteWorkspaces.remove, undefined, { id: workspace }))
          .$status
      ).toBe(204)
      expect(
        records(await call(noteEntries.list)).some(
          record => record.id === nested
        )
      ).toBe(false)
    })

    it('persists note attachments, isolates metadata and removes files with parent deletions', async () => {
      if (!admin) throw new Error('Local test database was not initialized')

      async function upload(entryId: string) {
        const stagedPath = path.join(storageDirectory, randomUUID() + '.txt')
        await fs.writeFile(stagedPath, 'synthetic uploaded note attachment')
        const file: StagedFile = {
          __staged: true,
          originalName: 'attachment.txt',
          mimeType: 'text/plain',
          size: 34,
          path: stagedPath,
          read: () => fs.readFile(stagedPath),
          stream: () => createReadStream(stagedPath)
        }
        expect(
          (
            await call(noteEntries.attach, {}, { id: entryId }, stranger, {
              file
            })
          ).$status
        ).toBe(404)
        expect(
          (await call(noteEntries.attach, {}, { id: entryId }, owner, { file }))
            .$status
        ).toBe(204)
        const key = records(await call(noteEntries.list)).find(
          record => record.id === entryId
        )?.file as string
        expect(
          await fs.readFile(path.join(storageDirectory, key), 'utf8')
        ).toBe('synthetic uploaded note attachment')
        await expect(fs.access(stagedPath)).rejects.toThrow()
        await db.transaction(async transaction => {
          await transaction.execute(
            sql`select set_config('zillion.user_id', ${owner}, true)`
          )
          expect(
            (await createFileMetadataStore(transaction).get(key))?.originalName
          ).toBe('attachment.txt')
        })
        await db.transaction(async transaction => {
          await transaction.execute(
            sql`select set_config('zillion.user_id', ${stranger}, true)`
          )
          expect(await createFileMetadataStore(transaction).get(key)).toBe(null)
        })

        return key
      }

      const workspace = await create(noteWorkspaces.create, {
        name: 'Attachments',
        icon: 'tabler:folder'
      })
      const subjectBody = {
        title: 'Attachment subject',
        description: '',
        icon: 'tabler:folder',
        workspace_id: workspace
      }
      const subject = await create(noteSubjects.create, subjectBody)
      const body = {
        name: 'File',
        type: 'file',
        content: '',
        subject_id: subject,
        parent_id: null
      }
      const fileEntry = await create(noteEntries.create, body)
      const firstKey = await upload(fileEntry)
      expect(
        (
          await call(
            noteEntries.update,
            { ...body, type: 'folder' },
            { id: fileEntry }
          )
        ).$status
      ).toBe(400)
      expect(
        (await call(noteEntries.detach, undefined, { id: fileEntry }, stranger))
          .$status
      ).toBe(404)
      expect(
        (await call(noteEntries.detach, undefined, { id: fileEntry })).$status
      ).toBe(204)
      await expect(
        fs.access(path.join(storageDirectory, firstKey))
      ).rejects.toThrow()
      const folder = await create(noteEntries.create, {
        ...body,
        name: 'Folder',
        type: 'folder'
      })
      const nested = await create(noteEntries.create, {
        ...body,
        parent_id: folder
      })
      const nestedKey = await upload(nested)
      expect(
        (await call(noteEntries.remove, undefined, { id: folder })).$status
      ).toBe(204)
      await expect(
        fs.access(path.join(storageDirectory, nestedKey))
      ).rejects.toThrow()
      const subjectKey = await upload(fileEntry)
      expect(
        (await call(noteSubjects.remove, undefined, { id: subject })).$status
      ).toBe(204)
      await expect(
        fs.access(path.join(storageDirectory, subjectKey))
      ).rejects.toThrow()
      const secondSubject = await create(noteSubjects.create, subjectBody)
      const secondEntry = await create(noteEntries.create, {
        ...body,
        subject_id: secondSubject
      })
      const workspaceKey = await upload(secondEntry)
      expect(
        (await call(noteWorkspaces.remove, undefined, { id: workspace }))
          .$status
      ).toBe(204)
      await expect(
        fs.access(path.join(storageDirectory, workspaceKey))
      ).rejects.toThrow()
      expect(
        (
          await admin`select count(*)::int as count from files where owner_id = ${owner}`
        )[0]?.count
      ).toBe(0)
    })

    it('persists flashcard reviews and isolates decks and cards', async () => {
      await verifyCrud(flashTags, { name: 'Tag CRUD', color: '#f97316' })
      const tag = await create(flashTags.create, {
        name: 'Learning',
        color: '#f97316'
      })
      const deckBody = { name: 'Deck', description: '', tag_id: tag }
      await verifyCrud(flashDecks, deckBody)
      const deck = await create(flashDecks.create, deckBody)
      const cardBody = {
        question: 'What persists?',
        answer: 'PostgreSQL rows',
        deck_id: deck
      }
      await verifyCrud(flashCards, cardBody)
      const card = await create(flashCards.create, cardBody)
      expect(
        (
          await call(
            flashCards.review,
            { remembered: true },
            { id: card },
            stranger
          )
        ).$status
      ).toBe(404)
      expect(
        (await call(flashCards.review, { remembered: true }, { id: card }))
          .$status
      ).toBe(204)
      expect(
        (await call(flashCards.review, { remembered: false }, { id: card }))
          .$status
      ).toBe(204)
      const reviewed = records(await call(flashCards.list)).find(
        record => record.id === card
      )
      expect(reviewed?.reviews).toBe(2)
      expect(reviewed?.correct).toBe(1)
      expect(reviewed?.next_review).toBeInstanceOf(Date)
      expect(
        (await call(flashDecks.remove, undefined, { id: deck })).$status
      ).toBe(204)
      expect(
        records(await call(flashCards.list)).some(record => record.id === card)
      ).toBe(false)
    })

    it('persists wishlist purchase timestamps, rejects invalid prices and cascades list deletions', async () => {
      const listBody = {
        name: 'List',
        description: '',
        color: '#f97316',
        icon: 'tabler:gift'
      }
      await verifyCrud(wishLists, listBody)
      const list = await create(wishLists.create, listBody)
      const itemBody = {
        name: 'Product',
        url: 'https://example.com/product',
        price: 12.5,
        image: '',
        list_id: list,
        bought: false
      }
      await verifyCrud(wishEntries, itemBody)
      await expect(
        call(wishEntries.create, { ...itemBody, price: -1 })
      ).rejects.toThrow()
      await expect(
        call(wishEntries.create, { ...itemBody, url: 'javascript:alert(1)' })
      ).rejects.toThrow()
      const item = await create(wishEntries.create, itemBody)
      expect(
        (
          await call(
            wishEntries.update,
            { ...itemBody, bought: true },
            { id: item }
          )
        ).$status
      ).toBe(204)
      const purchasedAt = records(await call(wishEntries.list)).find(
        record => record.id === item
      )?.bought_at
      expect(purchasedAt).toBeInstanceOf(Date)
      expect(
        (
          await call(
            wishEntries.update,
            { ...itemBody, bought: true, name: 'Renamed' },
            { id: item }
          )
        ).$status
      ).toBe(204)
      expect(
        records(await call(wishEntries.list)).find(record => record.id === item)
          ?.bought_at
      ).toEqual(purchasedAt)
      expect(
        (await call(wishEntries.update, itemBody, { id: item })).$status
      ).toBe(204)
      expect(
        records(await call(wishEntries.list)).find(record => record.id === item)
          ?.bought_at
      ).toBe(null)
      expect(
        (await call(wishLists.remove, undefined, { id: list })).$status
      ).toBe(204)
      expect(
        records(await call(wishEntries.list)).some(record => record.id === item)
      ).toBe(false)
    })

    it('keeps records after closing and reopening the connection', async () => {
      if (!connection)
        throw new Error('Local test database was not initialized')

      const id = await create(blogCategories.create, {
        name: 'Reconnect proof',
        color: '#f97316',
        icon: 'tabler:folder'
      })
      await connection.end()
      connection = postgres(process.env.DATABASE_URL!, { max: 2 })
      db = drizzle({ client: connection })
      expect(
        records(await call(blogCategories.list)).some(
          record => record.id === id
        )
      ).toBe(true)
      const role =
        await connection`select current_user, rolbypassrls from pg_roles where rolname = current_user`
      expect(role[0]?.rolbypassrls).toBe(false)
    })
  }
)
