import { hashSync } from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type Catalog,
  type Snapshot,
  applyMigration,
  assertLocalDestination,
  planMigration,
  readCatalog,
  readPocketBaseDatabase,
  rollbackMigration,
  safeReport,
  stableId
} from './migratePocketBase'

const fakeCatalog: Catalog = {
  users: [
    { name: 'id', type: 'uuid', nullable: false, default: null },
    { name: 'email', type: 'varchar', nullable: false, default: null },
    { name: 'username', type: 'varchar', nullable: false, default: null },
    {
      name: 'auth_password_hash',
      type: 'varchar',
      nullable: true,
      default: null
    },
    { name: 'theme', type: 'varchar', nullable: false, default: "'system'" },
    { name: 'language', type: 'varchar', nullable: false, default: "'en'" },
    { name: 'font_scale', type: 'float4', nullable: false, default: '1' }
  ],
  notes__workspaces: [
    { name: 'id', type: 'uuid', nullable: false, default: null },
    { name: 'owner_id', type: 'uuid', nullable: false, default: null },
    { name: 'name', type: 'varchar', nullable: false, default: null },
    { name: 'icon', type: 'varchar', nullable: false, default: null }
  ],
  notes__subjects: [
    { name: 'id', type: 'uuid', nullable: false, default: null },
    { name: 'owner_id', type: 'uuid', nullable: false, default: null },
    { name: 'title', type: 'varchar', nullable: false, default: null },
    { name: 'description', type: 'text', nullable: false, default: null },
    { name: 'icon', type: 'varchar', nullable: false, default: null },
    {
      name: 'workspace_id',
      type: 'uuid',
      nullable: false,
      default: null,
      references: 'notes__workspaces'
    }
  ],
  notes__entries: [
    { name: 'id', type: 'uuid', nullable: false, default: null },
    { name: 'owner_id', type: 'uuid', nullable: false, default: null },
    { name: 'name', type: 'varchar', nullable: false, default: null },
    { name: 'type', type: 'varchar', nullable: false, default: null },
    { name: 'content', type: 'text', nullable: false, default: null },
    {
      name: 'subject_id',
      type: 'uuid',
      nullable: false,
      default: null,
      references: 'notes__subjects'
    },
    {
      name: 'parent_id',
      type: 'uuid',
      nullable: true,
      default: null,
      references: 'notes__entries'
    },
    { name: 'file', type: 'varchar', nullable: true, default: null }
  ]
}

function fixture(suffix: string = randomUUID()): Snapshot {
  return {
    version: 1,
    collections: {
      users: [
        {
          id: suffix,
          email: suffix + '@synthetic.invalid',
          username: suffix,
          passwordHash: hashSync('synthetic-test-password', 4),
          theme: 'dark',
          language: 'ms',
          fontScale: 1.2
        }
      ],
      notes_entries: [
        {
          id: 'note',
          name: 'Synthetic attachment',
          type: 'file',
          subject: 'subject',
          parent: 'folder',
          file: 'attachment.txt'
        },
        {
          id: 'folder',
          name: 'Synthetic folder',
          type: 'folder',
          subject: 'subject',
          parent: ''
        }
      ],
      notes_subjects: [
        { id: 'subject', title: 'Synthetic subject', workspace: 'workspace' }
      ],
      notes_workspaces: [{ id: 'workspace', name: 'Synthetic workspace' }]
    }
  }
}

describe('PocketBase migration planner', () => {
  let temporary: string
  beforeAll(async () => {
    temporary = await fs.mkdtemp(
      path.join(os.tmpdir(), 'zillion-migration-plan-')
    )
    await fs.writeFile(
      path.join(temporary, 'attachment.txt'),
      'synthetic bytes'
    )
  })
  afterAll(async () => {
    await fs.rm(temporary, { recursive: true, force: true })
  })

  function withFile(input: Snapshot) {
    return {
      ...input,
      files: [
        {
          collection: 'notes_entries',
          record: 'note',
          field: 'file',
          path: 'attachment.txt',
          mimeType: 'text/plain'
        }
      ]
    }
  }
  it('preserves the password and settings in memory, maps relations and emits no private fields in the report', async () => {
    const input = withFile(fixture('user'))
    const plan = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'user',
      filesRoot: temporary
    })
    expect(plan.blockers).toEqual([])
    expect(plan.rows.map(row => row.table)).toEqual([
      'users',
      'notes__workspaces',
      'notes__subjects',
      'notes__entries',
      'notes__entries'
    ])
    const user = plan.rows[0]!
    expect(user.values.auth_password_hash).toBe(
      input.collections.users![0]!.passwordHash
    )
    expect(user.values.font_scale).toBe(1.2)
    expect(user.values.language).toBe('ms')
    expect(
      plan.rows.find(row => row.sourceId === 'note')?.values.parent_id
    ).toBe(stableId('notes_entries', 'folder'))
    expect(plan.files[0]?.key.startsWith('monolith--notes/')).toBe(true)
    const report = JSON.stringify(safeReport(plan))
    expect(report).not.toContain('@synthetic.invalid')
    expect(report).not.toContain('passwordHash')
    expect(report).not.toContain('auth_password_hash')
    expect(report).not.toContain('Synthetic attachment')
    expect(stableId('users', 'user')).toBe(plan.idMapping['users:user'])
  })
  it('blocks missing credentials, unmapped data, missing files and missing owner selection', async () => {
    const input = fixture('user')
    delete input.collections.users![0]!.passwordHash
    input.collections.users![0]!.unsupported = 'cannot silently discard this'
    const plan = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'missing'
    })
    expect(
      plan.blockers.some(message => message.includes('password hash'))
    ).toBe(true)
    expect(
      plan.blockers.some(message => message.includes('Unmapped field'))
    ).toBe(true)
    expect(
      plan.blockers.some(message => message.includes('File manifest'))
    ).toBe(true)
    expect(
      plan.blockers.some(message => message.includes('owner source id'))
    ).toBe(true)
  })
  it('blocks foreign owners, cycles, and paths escaping the file root', async () => {
    const input = withFile(fixture('user'))
    input.collections.users!.push({
      ...input.collections.users![0]!,
      id: 'second',
      email: 'second@synthetic.invalid',
      username: 'second'
    })
    input.collections.notes_workspaces![0]!._owner = 'second'
    input.collections.notes_entries![1]!.parent = 'note'
    input.files[0]!.path = '../outside.txt'
    const plan = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'user',
      filesRoot: temporary
    })
    expect(plan.blockers.some(message => message.includes('Cross-owner'))).toBe(
      true
    )
    expect(plan.blockers.some(message => message.includes('Cyclic'))).toBe(true)
    expect(
      plan.blockers.some(message => message.includes('unsafe file path'))
    ).toBe(true)
  })
  it('rejects production or unrelated local databases', () => {
    expect(() =>
      assertLocalDestination('postgres://local@host.example.com/zillion_dev')
    ).toThrow()
    expect(() =>
      assertLocalDestination('postgres://local@localhost/customer_data')
    ).toThrow()
    expect(() =>
      assertLocalDestination('postgres://local@127.0.0.1:55432/zillion_dev')
    ).not.toThrow()
  })
  it('includes the selected owner and file bytes in the batch identity', async () => {
    const input = withFile(fixture('user'))
    input.collections.users!.push({
      ...input.collections.users![0]!,
      id: 'second',
      email: 'second@synthetic.invalid',
      username: 'second'
    })
    const first = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'user',
      filesRoot: temporary
    })
    const otherOwner = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'second',
      filesRoot: temporary
    })
    expect(otherOwner.fingerprint).not.toBe(first.fingerprint)
    await fs.writeFile(
      path.join(temporary, 'attachment.txt'),
      'different synthetic bytes'
    )
    const differentFile = await planMigration(input, fakeCatalog, {
      ownerSourceId: 'user',
      filesRoot: temporary
    })
    expect(differentFile.fingerprint).not.toBe(first.fingerprint)
    await fs.writeFile(
      path.join(temporary, 'attachment.txt'),
      'synthetic bytes'
    )
  })
  it.each(['fields', 'schema'])(
    'reads an offline PocketBase SQLite copy with %s metadata without changing it',
    async schemaColumn => {
      const { DatabaseSync } = await import('node:sqlite')
      const databasePath = path.join(temporary, schemaColumn + '.db')
      const database = new DatabaseSync(databasePath)
      database.exec(
        'create table _collections (id text, name text, type text, "' +
          schemaColumn +
          '" text)'
      )
      const passwordColumn =
        schemaColumn === 'fields' ? 'password' : 'passwordHash'
      database.exec(
        'create table users (id text, email text, "' +
          passwordColumn +
          '" text, fontScale real)'
      )
      database.exec(
        'create table notes_entries (id text, file text, enabled integer, tags text)'
      )
      const fields = [
        { name: 'file', type: 'file' },
        { name: 'enabled', type: 'bool' },
        { name: 'tags', type: 'relation' }
      ]
      database
        .prepare('insert into _collections values (?, ?, ?, ?)')
        .run(
          'auth_collection',
          'users',
          'auth',
          schemaColumn === 'fields'
            ? JSON.stringify([{ name: 'password', type: 'password' }])
            : '[]'
        )
      database
        .prepare('insert into _collections values (?, ?, ?, ?)')
        .run(
          'notes_collection',
          'notes_entries',
          'base',
          JSON.stringify(fields)
        )
      database
        .prepare('insert into _collections values (?, ?, ?, ?)')
        .run('superusers', '_superusers', 'auth', '[]')
      database
        .prepare('insert into _collections values (?, ?, ?, ?)')
        .run('view', 'derived', 'view', '[]')
      const passwordHash = hashSync('synthetic-test-password', 4)
      database
        .prepare('insert into users values (?, ?, ?, ?)')
        .run('user', 'offline@synthetic.invalid', passwordHash, 1.2)
      database
        .prepare('insert into notes_entries values (?, ?, ?, ?)')
        .run('note', 'attachment.txt', 1, '["tag"]')
      database.close()
      const before = await fs.readFile(databasePath)
      const snapshot = await readPocketBaseDatabase(databasePath)
      expect(snapshot.collections.users?.[0]?.passwordHash).toBe(passwordHash)
      expect(snapshot.collections.notes_entries?.[0]?.enabled).toBe(true)
      expect(snapshot.collections.notes_entries?.[0]?.tags).toEqual(['tag'])
      expect(snapshot.files).toEqual([
        {
          collection: 'notes_entries',
          record: 'note',
          field: 'file',
          path: 'notes_collection/note/attachment.txt',
          mimeType: 'text/plain'
        }
      ])
      expect(Object.keys(snapshot.collections)).toEqual([
        'users',
        'notes_entries'
      ])
      expect(await fs.readFile(databasePath)).toEqual(before)
    }
  )
})

describe.skipIf(process.env.ZILLION_INTEGRATION !== '1')(
  'PocketBase migration rehearsal against synthetic local PostgreSQL',
  () => {
    let temporary: string
    let connection: ReturnType<typeof postgres>
    let databaseUrl: string
    let input: Snapshot
    let options: {
      databaseUrl: string
      storageRoot: string
      journalPath: string
    }
    beforeAll(async () => {
      const root = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../..'
      )
      dotenv.config({
        path: path.join(root, 'env/.env.local'),
        override: true,
        quiet: true
      })
      databaseUrl = process.env.DATABASE_ADMIN_URL!
      assertLocalDestination(databaseUrl)
      connection = postgres(databaseUrl, { max: 1, onnotice: () => {} })
      temporary = await fs.mkdtemp(
        path.join(os.tmpdir(), 'zillion-migration-db-')
      )
      await fs.writeFile(
        path.join(temporary, 'attachment.txt'),
        'synthetic migrated file'
      )
      input = fixture()
      input.files = [
        {
          collection: 'notes_entries',
          record: 'note',
          field: 'file',
          path: 'attachment.txt',
          mimeType: 'text/plain'
        }
      ]
      options = {
        databaseUrl,
        storageRoot: path.join(temporary, 'destination'),
        journalPath: path.join(temporary, 'private/journal.json')
      }
    })
    afterAll(async () => {
      const user = stableId('users', String(input.collections.users![0]!.id))
      await connection`delete from notes__workspaces where owner_id = ${user}`
      await connection`delete from files where owner_id = ${user}`
      await connection`delete from users where id = ${user}`
      await connection.end()
      await fs.rm(temporary, { recursive: true, force: true })
    })
    it('imports profile, bcrypt, settings, files and relations atomically; is idempotent; and rolls back only unchanged imports', async () => {
      const ownerSourceId = String(input.collections.users![0]!.id)
      const ownerId = stableId('users', ownerSourceId)
      const before =
        await connection`select count(*)::int as count from users where id = ${ownerId}`
      const plan = await planMigration(input, await readCatalog(connection), {
        ownerSourceId,
        filesRoot: temporary
      })
      expect(plan.blockers).toEqual([])
      expect(
        (
          await connection`select count(*)::int as count from users where id = ${ownerId}`
        )[0]?.count
      ).toBe(before[0]?.count)
      await fs.writeFile(
        path.join(temporary, 'attachment.txt'),
        'changed after dry-run'
      )
      await expect(applyMigration(plan, options)).rejects.toThrow(
        'Source file changed after dry-run'
      )
      expect(
        (
          await connection`select count(*)::int as count from users where id = ${plan.rows[0]!.id}`
        )[0]?.count
      ).toBe(0)
      expect(
        (
          await connection`select count(*)::int as count from notes__entries where owner_id = ${plan.rows[0]!.id}`
        )[0]?.count
      ).toBe(0)
      await fs.writeFile(
        path.join(temporary, 'attachment.txt'),
        'synthetic migrated file'
      )
      // A journal saved before an interrupted commit can inventory rows that never committed.
      await fs.mkdir(path.dirname(options.journalPath), { recursive: true })
      await fs.writeFile(
        options.journalPath,
        JSON.stringify({
          version: 1,
          batch: stableId('migration', plan.fingerprint),
          fingerprint: plan.fingerprint,
          rows: plan.rows.map(row => ({
            table: row.table,
            id: row.id,
            digest: '0'.repeat(64)
          })),
          files: plan.files.map(file => ({
            key: file.key,
            digest: file.digest
          })),
          createdAt: new Date().toISOString()
        }),
        { mode: 0o600 }
      )
      const result = await applyMigration(plan, options)
      expect(result).toEqual({ inserted: 5, skipped: 0, files: 1 })
      const [profile] =
        await connection`select language, font_scale, auth_password_hash from users where id = ${plan.rows[0]!.id}`
      expect(profile?.language).toBe('ms')
      expect(profile?.font_scale).toBeCloseTo(1.2)
      expect(profile?.auth_password_hash).toBe(
        input.collections.users![0]!.passwordHash
      )
      const journalText = await fs.readFile(options.journalPath, 'utf8')
      expect(JSON.parse(journalText).rows).toHaveLength(plan.rows.length)
      expect(journalText).not.toContain('password')
      expect(journalText).not.toContain('@synthetic.invalid')
      expect((await fs.stat(options.journalPath)).mode & 0o777).toBe(0o600)
      expect(
        await fs.readFile(
          path.join(options.storageRoot, plan.files[0]!.key),
          'utf8'
        )
      ).toBe('synthetic migrated file')
      expect(await applyMigration(plan, options)).toEqual({
        inserted: 0,
        skipped: 5,
        files: 0
      })
      const additionalId = randomUUID()
      await connection`insert into notes__entries (id, owner_id, name, type, content, subject_id, parent_id) values (${additionalId}, ${plan.rows[0]!.id}, 'New synthetic child', 'note', '', ${stableId('notes_subjects', 'subject')}, ${stableId('notes_entries', 'folder')})`
      await expect(rollbackMigration(options)).rejects.toThrow(
        'New records depend on migrated data'
      )
      await connection`delete from notes__entries where id = ${additionalId}`
      await fs.writeFile(
        path.join(options.storageRoot, plan.files[0]!.key),
        'new user attachment'
      )
      await expect(rollbackMigration(options)).rejects.toThrow(
        'Imported file changed after migration'
      )
      await fs.writeFile(
        path.join(options.storageRoot, plan.files[0]!.key),
        'synthetic migrated file'
      )
      await connection`update notes__entries set content = 'new user content' where id = ${stableId('notes_entries', 'note')}`
      await expect(rollbackMigration(options)).rejects.toThrow(
        'changed after migration'
      )
      await connection`update notes__entries set content = '' where id = ${stableId('notes_entries', 'note')}`
      expect(await rollbackMigration(options)).toBe(5)
      expect(
        (
          await connection`select count(*)::int as count from users where id = ${plan.rows[0]!.id}`
        )[0]?.count
      ).toBe(0)
      await expect(
        fs.access(path.join(options.storageRoot, plan.files[0]!.key))
      ).rejects.toThrow()
    })
  }
)
