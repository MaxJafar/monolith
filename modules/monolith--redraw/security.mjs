// Real HTTP and PostgreSQL checks, restricted to the repository's isolated local database.
import { resolveAddonIdentity } from '@monolith/configs/node'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_ADMIN_URL || '')

if (
  process.env.NODE_ENV === 'production' ||
  !['postgres:', 'postgresql:'].includes(database.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.port !== '55432' ||
  !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(database.pathname)
)
  throw Error('Use the isolated local development database')

const require = createRequire(resolve(root, 'apps/api/package.json'))
const sql = require('postgres')(database.href, { max: 1 })
const remote = resolveAddonIdentity({ name: '@monolith/redraw' }).remoteId
const api = `http://localhost:3636/modules/${remote}/projects`
const people = Object.fromEntries(
  ['owner', 'viewer', 'editor', 'outsider'].map(role => [
    role,
    { id: randomUUID(), role, token: '' }
  ])
)
const workspace = randomUUID(),
  otherWorkspace = randomUUID()
const password = `Fixture-${randomUUID()}!`
const document = {
  version: 1,
  pages: [
    {
      id: randomUUID(),
      name: 'Board',
      mode: 'blackboard',
      background: '#ffffff',
      elements: [],
      connectors: []
    }
  ]
}

let checks = 0

async function request(person, route, body, scope = workspace, query = {}) {
  const response = await fetch(
    `${api}/${route}?${new URLSearchParams({ workspace_id: scope, ...query })}`,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(person ? { Authorization: `Bearer ${person.token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }
  )
  const text = await response.text()

  let json

  try {
    json = JSON.parse(text)
  } catch {
    json = { message: text }
  }

  return { status: response.status, data: json.data }
}

function status(result, expected, message) {
  assert.equal(result.status, expected, message)
  checks++

  return result.data
}

async function synchronize(person, body, scope = workspace) {
  const response = await fetch(
    `http://localhost:3636/modules/${remote}/collaboration/sync?workspace_id=${scope}`,
    {
      method: 'POST',
      headers: {
        ...(person ? { Authorization: `Bearer ${person.token}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )
  const json = await response.json()

  return { status: response.status, data: json.data }
}

try {
  const passwordHash = await hash(password, 4)

  for (const person of Object.values(people)) {
    const email = `redraw-${person.id}@example.invalid`
    await sql`insert into users (id,email,username,name,auth_password_hash) values (${person.id},${email},${'redraw-' + person.id},${'Redraw test ' + person.role},${passwordHash})`
    const login = await fetch('http://localhost:3636/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    assert.equal(login.status, 200, 'Synthetic test account can log in')
    person.token = (await login.json()).data.accessToken
  }
  for (const id of [workspace, otherWorkspace])
    await sql`insert into zillion_databases__workspaces (id,owner_id,name,enabled_modules) values (${id},${people.owner.id},'Redraw isolated checks','["redraw"]'::jsonb)`
  for (const role of ['viewer', 'editor'])
    await sql`insert into zillion_databases__workspace_members (owner_id,workspace_id,user_id,role) values (${people.owner.id},${workspace},${people[role].id},${role})`

  status(
    await request(null, 'list'),
    401,
    'Unauthenticated requests are denied'
  )
  let project = status(
    await request(people.owner, 'create', {
      title: 'Permission checks',
      document
    }),
    200,
    'Owner creates a project'
  )

  const body = {
    id: project.id,
    expected_revision: project.revision,
    title: project.title,
    document
  }
  const list = status(
    await request(people.viewer, 'list'),
    200,
    'Viewer can list projects'
  )
  assert.deepEqual(
    list.map(p => p.id),
    [project.id]
  )
  assert.equal('document' in list[0], false)
  status(
    await request(people.viewer, 'get', undefined, workspace, {
      id: project.id
    }),
    200,
    'Viewer can read a project'
  )
  status(
    await request(people.viewer, 'create', { title: 'Denied', document }),
    403,
    'Viewer cannot create'
  )
  status(await request(people.viewer, 'save', body), 403, 'Viewer cannot save')
  status(
    await request(people.viewer, 'update', {
      id: project.id,
      expected_revision: 1,
      archived: true
    }),
    403,
    'Viewer cannot archive'
  )
  status(
    await request(people.outsider, 'get', undefined, workspace, {
      id: project.id
    }),
    404,
    'Outsider cannot discover projects'
  )
  status(
    await request(people.outsider, 'list'),
    404,
    'Outsider cannot list projects'
  )
  status(
    await request(people.owner, 'get', undefined, otherWorkspace, {
      id: project.id
    }),
    404,
    'Even the owner must use the correct workspace'
  )
  status(
    await request(people.editor, 'get', undefined, otherWorkspace, {
      id: project.id
    }),
    404,
    'Shared access never grants access to the owner’s other workspace'
  )
  status(
    await request(people.owner, 'save', body, otherWorkspace),
    409,
    'Cross-workspace saves cannot affect the project'
  )
  const empty = status(
    await request(people.owner, 'list', undefined, otherWorkspace),
    200,
    'Workspace listings are isolated'
  )
  assert.deepEqual(empty, [])

  const results = await Promise.all([
    request(people.owner, 'save', { ...body, title: 'Owner revision' }),
    request(people.editor, 'save', { ...body, title: 'Editor revision' })
  ])
  assert.deepEqual(
    results.map(r => r.status).sort(),
    [200, 409],
    'Exactly one concurrent save succeeds'
  )
  checks++
  project = results.find(result => result.status === 200).data
  assert.equal(project.revision, 2)
  project = status(
    await request(people.editor, 'save', {
      ...body,
      title: 'Shared editor',
      expected_revision: project.revision
    }),
    200,
    'Editor can save using the latest revision'
  )
  status(
    await request(people.owner, 'save', body),
    409,
    'Stale revisions are rejected'
  )
  status(
    await request(people.owner, 'create', {
      title: 'Invalid',
      document: { version: 1, pages: [] }
    }),
    400,
    'Malformed document rejected'
  )
  status(
    await request(people.owner, 'create', {
      title: 'Invalid',
      document: { ...document, pages: [document.pages[0], document.pages[0]] }
    }),
    400,
    'Duplicate identities rejected'
  )
  const invalidConnection = structuredClone(document)
  invalidConnection.pages[0].connectors.push({
    id: randomUUID(),
    source: randomUUID(),
    target: randomUUID(),
    label: '',
    color: '#000000',
    style: 'curve',
    arrow: true
  })
  status(
    await request(people.owner, 'create', {
      title: 'Invalid',
      document: invalidConnection
    }),
    400,
    'Dangling connections rejected'
  )

  project = status(
    await request(people.owner, 'update', {
      id: project.id,
      expected_revision: project.revision,
      starred: true
    }),
    200,
    'Starred state persists'
  )
  assert.equal(project.starred, true)
  project = status(
    await request(people.owner, 'update', {
      id: project.id,
      expected_revision: project.revision,
      archived: true
    }),
    200,
    'Archive persists'
  )
  status(
    await request(people.editor, 'save', {
      ...body,
      expected_revision: project.revision
    }),
    409,
    'Archived projects cannot be overwritten'
  )
  assert.deepEqual(
    status(
      await request(people.owner, 'list'),
      200,
      'Archive hidden from active list'
    ),
    []
  )
  assert.equal(
    status(
      await request(people.owner, 'list', undefined, workspace, {
        archived: 'true'
      }),
      200,
      'Archive visible in archive list'
    )[0].id,
    project.id
  )
  project = status(
    await request(people.owner, 'update', {
      id: project.id,
      expected_revision: project.revision,
      archived: false
    }),
    200,
    'Restore preserves document'
  )
  assert.deepEqual(project.document, document)
  const presence = {
    page: document.pages[0].id,
    cursor: { x: 120, y: 50 },
    selection: []
  }
  const ownerSync = {
    id: project.id,
    session: randomUUID(),
    revision: project.revision,
    presence
  }
  const editorSync = { ...ownerSync, session: randomUUID() }
  const viewerSync = { ...ownerSync, session: randomUUID() }
  const base = { title: project.title, document: project.document }
  const ownerNext = structuredClone(base),
    editorNext = structuredClone(base)
  ownerNext.title = 'Live owner title'
  editorNext.document.pages[0].background = '#ff0000'
  status(
    await synchronize(null, ownerSync),
    401,
    'Collaboration requires authentication'
  )
  status(
    await synchronize(people.outsider, ownerSync),
    404,
    'Outsiders cannot join live sessions'
  )
  status(
    await synchronize(people.owner, ownerSync, otherWorkspace),
    404,
    'Live sessions are workspace-scoped'
  )
  status(
    await synchronize(people.viewer, {
      ...viewerSync,
      change: { sequence: 1, base, next: ownerNext }
    }),
    403,
    'Viewers cannot submit live edits'
  )
  const live = await Promise.all([
    synchronize(people.owner, {
      ...ownerSync,
      change: { sequence: 1, base, next: ownerNext }
    }),
    synchronize(people.editor, {
      ...editorSync,
      change: { sequence: 1, base, next: editorNext }
    })
  ])
  live.forEach(result => status(result, 200, 'Concurrent edits are accepted'))
  project = status(
    await request(people.owner, 'get', undefined, workspace, {
      id: project.id
    }),
    200,
    'Merged project is readable'
  )
  assert.equal(project.title, ownerNext.title)
  assert.equal(project.document.pages[0].background, '#ff0000')
  checks += 2
  const replay = status(
    await synchronize(people.owner, {
      ...ownerSync,
      change: { sequence: 1, base, next: ownerNext }
    }),
    200,
    'Lost acknowledgement can be retried'
  )
  assert.equal(
    replay.project.revision,
    project.revision,
    'Retry does not reapply the edit'
  )
  checks++
  const presenceResult = status(
    await synchronize(people.viewer, viewerSync),
    200,
    'Viewers can join live presence'
  )
  assert.equal(presenceResult.peers.length, 2)
  assert.ok(
    presenceResult.peers.some(peer => peer.name === 'Redraw test owner')
  )
  checks += 2
  status(
    await synchronize(people.owner, {
      ...ownerSync,
      change: { sequence: 3, base, next: ownerNext }
    }),
    409,
    'Out-of-order client updates are rejected'
  )
  await sql`delete from zillion_databases__workspace_members where workspace_id=${workspace} and user_id=${people.editor.id}`
  status(
    await synchronize(people.editor, editorSync),
    404,
    'Revoked members lose presence access'
  )
  const afterRevocation = status(
    await synchronize(people.owner, ownerSync),
    200,
    'Remaining members can still synchronize'
  )
  assert.equal(
    afterRevocation.peers.some(peer => peer.name === 'Redraw test editor'),
    false
  )
  checks++
  status(
    await request(people.editor, 'save', {
      ...body,
      expected_revision: project.revision
    }),
    404,
    'Revoked membership cannot continue saving'
  )
  await sql`delete from zillion_databases__workspaces where id=${workspace} and owner_id=${people.owner.id}`
  const remaining =
    await sql`select id from redraw__projects where id=${project.id}`
  assert.equal(
    remaining.length,
    0,
    'Deleting a workspace removes only its own Redraw projects'
  )
  checks++
  console.log(
    `Redraw security passed: ${checks} HTTP and database assertions covering authentication, workspace isolation, viewer/editor roles, revoked membership, concurrent saves, validation, archive/restore and workspace cleanup.`
  )
} finally {
  await sql`delete from redraw__projects where workspace_id in (${workspace},${otherWorkspace}) and owner_id=${people.owner.id}`
  await sql`delete from zillion_databases__workspaces where id in (${workspace},${otherWorkspace}) and owner_id=${people.owner.id}`

  for (const person of Object.values(people)) {
    await sql`delete from auth__refresh_tokens where user_id=${person.id}`
    await sql`delete from users where id=${person.id}`
  }
  await sql.end()
}
