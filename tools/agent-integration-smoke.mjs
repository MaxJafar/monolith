import { hash } from 'bcryptjs'
import { config } from 'dotenv'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'

import { MonolithClient } from '../packages/agent-tools/dist/client.js'
import { ProfileStore } from '../packages/agent-tools/dist/profiles.js'
import { ToolService } from '../packages/agent-tools/dist/tools.js'

config({ path: resolve('env/.env.local'), quiet: true })
const require = createRequire(resolve('packages/agent-tools/package.json'))
const apiRequire = createRequire(resolve('apps/api/package.json'))
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const {
  StdioClientTransport
} = require('@modelcontextprotocol/sdk/client/stdio.js')
const { Ajv2020 } = require('ajv/dist/2020.js')
const { fullFormats } = require('ajv-formats/dist/formats.js')
const origin = process.env.MONOLITH_AGENT_TEST_SERVER ?? 'http://127.0.0.1:8789'
const target = new URL(origin),
  database = new URL(process.env.DATABASE_ADMIN_URL)
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.protocol !== 'http:' ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  database.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(database.pathname)
)
  throw Error(
    'Agent smoke tests require the isolated local development database and a loopback gateway.'
  )
const db = apiRequire('postgres')(database.href, { max: 1 })
const directory = await mkdtemp(resolve('.temp/agent-live-'))
const users = Array.from({ length: 3 }, () => randomUUID()),
  [owner, viewer, outsider] = users
const workspace = randomUUID(),
  password = randomUUID() + '!Aa1'
const clients = users.map(
  (_, index) =>
    new MonolithClient(new ProfileStore(`account-${index}`, directory))
)
const service = new ToolService(clients[0], {
  allowWrites: true,
  allowDeletes: true
})
let mcp
try {
  assert.equal(
    (await fetch(origin + '/api/integrations/catalog')).status,
    401,
    'Catalog requires authentication'
  )
  for (const id of users)
    await db`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Monolith Agent Test',${await hash(password, 10)})`
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Agent Integration Test','collaborative','[]'::jsonb,true)`
  await db`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${viewer},'viewer')`
  await db`insert into monolith_editor_rollouts(workspace_id,enabled) values(${workspace},true)`
  for (const [index, id] of users.entries())
    await clients[index].login(
      origin,
      id + '@example.invalid',
      password,
      async () => {
        throw Error('Unexpected TOTP')
      }
    )
  const tools = await service.list()
  const ajv = new Ajv2020({ strict: false, formats: fullFormats })
  for (const tool of tools) ajv.compile(tool.inputSchema)
  assert.ok(tools.length > 40, 'All expected native tools are discoverable')
  assert.ok(
    !tools.some(tool =>
      /credential|install|setMember|publish|shell/.test(tool.name)
    )
  )
  assert.ok(
    (await service.call('workspaces_list', {})).some(
      item => item.id === workspace
    )
  )
  const page = await service.call('pages_create', {
    query: { workspace_id: workspace },
    body: { title: 'Agent test page' }
  })
  const identity = { workspaceId: workspace, kind: 'page', id: page.id }
  const document = await service.call('document_initialize', identity)
  const note = document.snapshot.blocks.children.find(
    block => block.flavour === 'affine:note'
  )
  assert.ok(note, 'Canonical document has an editable note')
  note.children.push({
    type: 'block',
    id: randomUUID(),
    flavour: 'affine:paragraph',
    version: 1,
    props: {
      type: 'text',
      text: {
        '$blocksuite:internal:text$': true,
        delta: [{ insert: 'Created through Monolith MCP and CLI.' }]
      }
    },
    children: []
  })
  const save = {
    ...identity,
    expectedRevision: document.revision,
    snapshot: document.snapshot
  }
  const updated = await service.call('document_save', save)
  assert.equal(updated.revision, document.revision + 1)
  await assert.rejects(
    service.call('document_save', save),
    error => error.status === 409
  )
  const viewerService = new ToolService(clients[1], {
    allowWrites: true,
    allowDeletes: false
  })
  assert.equal(
    (await viewerService.call('document_read', identity)).revision,
    updated.revision
  )
  await assert.rejects(
    viewerService.call('document_save', {
      ...save,
      expectedRevision: updated.revision
    }),
    error => error.status === 403
  )
  await assert.rejects(
    viewerService.call('pages_create', {
      query: { workspace_id: workspace },
      body: { title: 'Denied' }
    }),
    error => error.status === 403
  )
  const stranger = new ToolService(clients[2], {
    allowWrites: false,
    allowDeletes: false
  })
  await assert.rejects(stranger.call('document_read', identity), error =>
    [403, 404].includes(error.status)
  )
  const base = await service.call('databases_create', {
    query: { workspace_id: workspace },
    body: { name: 'Agent test database' }
  })
  const record = await service.call('records_create', {
    query: { workspace_id: workspace },
    body: { base_id: base.id, title: 'Agent test record' }
  })
  assert.ok(
    (
      await service.call('databases_snapshot', {
        query: { workspace_id: workspace }
      })
    ).records.some(item => item.id === record.id)
  )
  const project = await service.call('projects_create', {
    body: {
      name: 'Agent test project',
      description: '',
      color: '#6366f1',
      icon: 'lucide:folder',
      category_id: null,
      status_id: null,
      visibility_id: null,
      technology_ids: []
    }
  })
  const column = await service.call('columns_create', {
    body: {
      name: 'Todo',
      project_id: project.id,
      color: '#6366f1',
      icon: 'lucide:circle'
    }
  })
  const task = await service.call('tasks_create', {
    body: {
      title: 'Agent task',
      content: '',
      column_id: column.id,
      completed: false
    }
  })
  assert.ok(
    (await service.call('tasks_list', {})).some(item => item.id === task.id)
  )
  assert.ok(
    Array.isArray(
      await service.call('events_list', {
        query: { start: '2026-10-17T00:00:00Z', end: '2026-10-18T00:00:00Z' }
      })
    )
  )
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      resolve('packages/agent-tools/dist/cli.js'),
      '--profile',
      'account-0',
      'mcp'
    ],
    env: { MONOLITH_CONFIG_DIR: directory },
    stderr: 'pipe'
  })
  mcp = new Client({ name: 'monolith-live-test', version: '1.0.0' })
  await mcp.connect(transport)
  const result = await mcp.callTool({
    name: 'monolith_document_read',
    arguments: identity
  })
  assert.equal(result.isError, undefined)
  assert.ok(
    JSON.stringify(result).includes('Created through Monolith MCP and CLI.')
  )
  const cli = await new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve('packages/agent-tools/dist/cli.js'),
        '--profile',
        'account-0',
        'doctor'
      ],
      {
        env: { ...process.env, MONOLITH_CONFIG_DIR: directory },
        windowsHide: true
      }
    )
    let stdout = '',
      stderr = ''
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', code => resolveResult({ code, stdout, stderr }))
  })
  assert.equal(cli.code, 0, cli.stderr)
  assert.ok(JSON.parse(cli.stdout).connected)
  const profile = await clients[0].store.read()
  await clients[0].store.save({ ...profile, expiresAt: 0 })
  await clients[0].status()
  assert.notEqual(
    (await clients[0].store.read()).refreshToken,
    profile.refreshToken
  )
  await clients[0].logout()
  const denied = await fetch(origin + '/api/integrations/catalog', {
    headers: { authorization: `Bearer ${profile.accessToken}` }
  })
  assert.equal(denied.status, 401)
  console.log(
    `Monolith live agent integration passed: ${tools.length} tools; real device login/refresh/revocation; page, document, database, project and task writes; viewer and cross-account isolation; revision conflict; MCP and CLI.`
  )
} finally {
  await mcp?.close()
  for (const client of clients) await client.logout().catch(() => {})
  await db`delete from users where id in ${db(users)}`
  await db.end()
  if (!directory.startsWith(resolve('.temp') + sep))
    throw Error('Test cleanup escaped workspace')
  await rm(directory, { recursive: true, force: true })
}
