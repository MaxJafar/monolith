// Isolated, synthetic protocol fixture. Never opens the user's database or credentials.
import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
  randomUUID
} from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { z } from 'zod'

import { contract } from '../modules/monolith--databases/client/contract.ts'

const port = 18764
const workspace = '33333333-3333-4333-8333-333333333333'
const account = '11111111-1111-4111-8111-111111111111'
const base = '66666666-6666-4666-8666-666666666666'
const now = new Date().toISOString()
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048
})
const pages = [
  {
    id: '77777777-7777-4777-8777-777777777777',
    workspace_id: workspace,
    parent_id: null,
    route_key: null,
    title: 'A little space for ideas',
    icon: '',
    position: 0,
    revision: 1
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    workspace_id: workspace,
    parent_id: null,
    route_key: null,
    title: 'Weekend field notes',
    icon: '',
    position: 1,
    revision: 1
  }
]
const records = [
  ['Plan the next small thing', 'task'],
  ['Make space for the weekend', 'project'],
  ['Sketches and passing thoughts', 'note'],
  ['A moment to reflect', 'event']
].map(([title, item_type], index) => ({
  id: `99999999-9999-4999-8999-${String(index + 1).padStart(12, '0')}`,
  base_id: base,
  title,
  item_type,
  content: '',
  description: '',
  appearance: {},
  comments: [],
  created_by: account,
  updated_by: account,
  done: false,
  status: 'planned',
  priority: index === 0 ? 'high' : 'normal',
  tags: [],
  date: index === 0 || index === 3 ? now.slice(0, 10) : null,
  end_date: null,
  project_id: null,
  values: {},
  created: now,
  updated: now
}))
const rich = (text: string) => ({
  '$blocksuite:internal:text$': true,
  delta: [{ insert: text }]
})

type FixtureBlock = {
  type: string
  id: string
  flavour: string
  version: number
  props: Record<string, unknown>
  children: FixtureBlock[]
}

const block = (
  flavour: string,
  props: Record<string, unknown> = {},
  children: FixtureBlock[] = []
): FixtureBlock => ({
  type: 'block',
  id: randomUUID(),
  flavour,
  version: flavour === 'affine:page' ? 2 : 1,
  props,
  children
})

type FixtureDocument = {
  source: { kind: string; id: string }
  workspaceId: string
  revision: number
  formatVersion: number
  recovery: boolean
  updatedAt: string
  snapshot: {
    type: string
    meta: { id: string; title: string; createDate: number; tags: string[] }
    blocks: FixtureBlock
  }
}

const documents = new Map<string, FixtureDocument>()

function document(kind: string, id: string) {
  if (!documents.has(id)) {
    const title =
      pages.find(p => p.id === id)?.title ||
      records.find(r => r.id === id)?.title ||
      'Untitled'
    documents.set(id, {
      source: { kind, id },
      workspaceId: workspace,
      revision: 1,
      formatVersion: 2,
      recovery: false,
      updatedAt: now,
      snapshot: {
        type: 'page',
        meta: { id, title, createDate: Date.now(), tags: [] },
        blocks: block('affine:page', { title: rich(title) }, [
          block('affine:surface', { elements: {} }),
          block('affine:note', {}, [
            block('affine:paragraph', {
              type: 'h2',
              text: rich('Room for what matters.')
            }),
            block('affine:paragraph', {
              type: 'text',
              text: rich(
                'This is a native Kotlin editor connected to an isolated test host. Your real workspace is untouched.'
              )
            }),
            block('affine:list', {
              type: 'todo',
              checked: false,
              text: rich('Capture one good idea')
            })
          ])
        ])
      }
    })
  }

  return documents.get(id)!
}
mkdirSync('.temp/android-test-host', { recursive: true })
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, 'http://localhost')
    const chunks: Buffer[] = []

    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    let body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
    let aes: Buffer | undefined

    const wrapped = body.k || req.headers['x-monolith-key']

    if (wrapped) {
      aes = privateDecrypt(
        { key: privateKey, oaepHash: 'sha256' },
        Buffer.from(String(wrapped), 'base64')
      )

      if (body.k) {
        const cipher = createDecipheriv(
          'aes-256-gcm',
          aes,
          Buffer.from(body.iv, 'base64')
        )
        cipher.setAuthTag(Buffer.from(body.tag, 'base64'))
        body = JSON.parse(
          Buffer.concat([
            cipher.update(Buffer.from(body.data, 'base64')),
            cipher.final()
          ]).toString()
        )
      }
    }
    let result: unknown
    let raw = false
    let status = 200

    const path = url.pathname

    if (path === '/.well-known/monolith') {
      raw = true
      result = {
        serverId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: 'Companion test space',
        apiVersion: 1,
        editorVersion: 2,
        capabilities: [
          'device-sessions',
          'editor-v2',
          'local-drafts',
          'revision-conflicts'
        ]
      }
    } else if (path.startsWith('/api/v1/device-sessions')) {
      raw = true
      result = {
        accountId: account,
        sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        accessToken: 'fixture-access',
        refreshToken: 'fixture-refresh'
      }
    } else if (req.headers.authorization !== 'Bearer fixture-access') {
      raw = true
      status = 401
      result = { message: 'Sign in to the fixture host' }
    } else if (path === '/api/encryptionPublicKey')
      result = publicKey.export({ type: 'spki', format: 'pem' })
    else if (path.includes('/editor-documents/')) {
      raw = true
      const parts = path.split('/')
      const kind = parts[4],
        id = parts[5]
      const current = document(kind, id)

      if (req.method === 'PUT') {
        if (body.expectedRevision !== current.revision) {
          status = 409
          result = {
            code: 'revision_conflict',
            message: 'A newer server document exists',
            current
          }
        } else {
          current.snapshot = body.snapshot
          current.revision++
          result = current
          appendFileSync(
            '.temp/android-test-host/events.ndjson',
            JSON.stringify({
              operation: 'saveDocument',
              id,
              revision: current.revision,
              title: body.snapshot.meta.title
            }) + '\n'
          )
        }
      } else result = current
    } else if (path.endsWith('/workspaces/list'))
      result = [
        {
          id: workspace,
          owner_id: account,
          name: 'Everyday space',
          icon: '',
          profile: 'personal',
          enabled_modules: [
            '@monolith/atlas',
            '@monolith/automations',
            '@monolith/gym'
          ],
          description: 'Fixture workspace',
          is_default: true,
          native_imported: true,
          navigation: {},
          created: now,
          updated: now,
          role: 'owner'
        }
      ]
    else if (path.endsWith('/workspaceDatabases/snapshot'))
      result = {
        bases: [
          {
            id: base,
            workspace_id: workspace,
            owner_id: account,
            name: 'Everyday',
            description: '',
            table_type: 'general',
            source_type: 'native',
            templates: [],
            created: now,
            updated: now
          }
        ],
        records,
        fields: [],
        views: [],
        links: []
      }
    else if (path.endsWith('/workspaces/pages')) result = pages
    else if (path.endsWith('/calendar/list'))
      result = { schedules: [], email_ready: false }
    else if (path === '/api/rooms/list') result = []
    else if (path.endsWith('/workspaceDatabases/updateRecord')) {
      z.fromJSONSchema(
        contract.workspaceDatabases.updateRecord.input.body as Parameters<
          typeof z.fromJSONSchema
        >[0]
      ).parse(body)
      const found = records.find(r => r.id === url.searchParams.get('id'))

      if (!found) throw Error('Unknown record')
      Object.assign(found, body, { updated: new Date().toISOString() })
      result = found
      appendFileSync(
        '.temp/android-test-host/events.ndjson',
        JSON.stringify({
          operation: 'updateRecord',
          id: found.id,
          done: found.done
        }) + '\n'
      )
    } else if (path.endsWith('/workspaceDatabases/createRecord')) {
      z.fromJSONSchema(
        contract.workspaceDatabases.createRecord.input.body as Parameters<
          typeof z.fromJSONSchema
        >[0]
      ).parse(body)
      const record = {
        ...records[0],
        ...body,
        id: randomUUID(),
        created: now,
        updated: now
      }
      records.push(record)
      result = record.id
      appendFileSync(
        '.temp/android-test-host/events.ndjson',
        JSON.stringify({
          operation: 'createRecord',
          id: record.id,
          title: record.title
        }) + '\n'
      )
    } else if (path === '/api/search/query')
      result = {
        hits: pages
          .filter(p =>
            p.title.toLowerCase().includes(String(body.query).toLowerCase())
          )
          .map(p => ({
            ...p,
            source_id: `page:${p.id}`,
            kind: 'page',
            excerpt: 'A page in your test space.'
          })),
        answer: [],
        total: pages.length,
        ready: true,
        stages: [],
        warnings: [],
        model: ''
      }
    else if (path.endsWith('/flows/list')) result = []
    else if (path.endsWith('/snapshot'))
      result = {
        nodes: pages.map(p => ({
          id: p.id,
          key: 'page:' + p.id,
          title: p.title,
          kind: 'page'
        })),
        edges: [],
        databases: [],
        unresolved: []
      }
    else {
      status = 404
      raw = true
      result = {
        code: 'fixture_unimplemented',
        message: 'This fixture does not simulate this operation'
      }
    }

    if (!raw && aes) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', aes, iv)
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(result)),
        cipher.final()
      ])
      result = {
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
      }
    }
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(raw ? result : { state: 'success', data: result }))
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        state: 'error',
        message: error instanceof Error ? error.message : 'Fixture error'
      })
    )
  }
})
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Synthetic Android test host: http://127.0.0.1:${port}; use any test email/password. No real data is accessed.`
  )
)
