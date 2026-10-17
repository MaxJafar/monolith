// Full live-editor verification. All users, workspaces and projects belong to this test.
import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { makeDocument, makeElement } from './client/src/model.ts'
import { figFixture, penpotFixture } from './import-fixtures.ts'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_ADMIN_URL || '')

if (
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  database.port !== '55432' ||
  database.pathname !== '/zillion_dev'
)
  throw Error('Isolated local database only')

const require = createRequire(resolve(root, 'apps/api/package.json')),
  sql = require('postgres')(database.href, { max: 1 })
const remote = resolveAddonIdentity({ name: '@monolith/redraw' }).remoteId
const api = `http://localhost:3636/modules/${remote}`,
  origin = 'http://localhost:5173'
const workspace = randomUUID(),
  password = `Redraw-${randomUUID()}!`
/** @type {Record<string, { id: string, role: string, context: import('@playwright/test').BrowserContext | null, page: import('@playwright/test').Page | null, token: string }>} */
const people = Object.fromEntries(
  ['owner', 'editor', 'viewer'].map(role => [
    role,
    { id: randomUUID(), role, context: null, page: null, token: '' }
  ])
)
const browser = await chromium.launch({ headless: true }),
  errors = []
const artifacts = resolve(root, '.temp/redraw-v2-acceptance')
mkdirSync(artifacts, { recursive: true })
let projectId

const document = makeDocument('canvas', 'Canvas')
const alpha = makeElement('rectangle', { x: 120, y: 120 }, 'Alpha'),
  beta = makeElement('text', { x: 400, y: 120 }, 'Beta')
document.pages[0].elements = [alpha, beta]
const ui = person => person.page.locator('.redraw')
const saved = person =>
  expect(ui(person).getByRole('status')).toHaveText('All changes saved', {
    timeout: 15000
  })

async function getProject(id = projectId) {
  const response = await people.owner.context.request.get(
    `${api}/projects/get?workspace_id=${workspace}&id=${id}`,
    { headers: { Authorization: `Bearer ${people.owner.token}` } }
  )
  assert.equal(response.status(), 200)

  return (await response.json()).data
}

async function select(person, id) {
  await ui(person).locator(`[data-layer="${id}"] button`).first().dblclick()
}

async function textEdit(person, id, value) {
  await select(person, id)
  await ui(person)
    .getByRole('textbox', { name: 'Text', exact: true })
    .fill(value)
}

try {
  const passwordHash = await hash(password, 4)

  for (const person of Object.values(people)) {
    const email = `redraw-live-${person.id}@example.invalid`
    await sql`insert into users (id,email,username,name,auth_password_hash) values (${person.id},${email},${'redraw-live-' + person.id},${'Redraw ' + person.role},${passwordHash})`
    person.context = await browser.newContext({
      viewport: { width: 1660, height: 1150 }
    })
    const login = await person.context.request.post(
      'http://localhost:3636/auth/login',
      { data: { email, password } }
    )
    assert.equal(login.status(), 200)
    person.token = (await login.json()).data.accessToken
    person.page = await person.context.newPage()
    person.page.on('pageerror', error => errors.push(error.message))
  }
  await sql`insert into zillion_databases__workspaces (id,owner_id,name,enabled_modules) values (${workspace},${people.owner.id},'Redraw live test','["redraw"]'::jsonb)`
  for (const role of ['editor', 'viewer'])
    await sql`insert into zillion_databases__workspace_members (owner_id,workspace_id,user_id,role) values (${people.owner.id},${workspace},${people[role].id},${role})`

  const created = await people.owner.context.request.post(
    `${api}/projects/create?workspace_id=${workspace}`,
    {
      headers: { Authorization: `Bearer ${people.owner.token}` },
      data: { title: 'Shared design', document }
    }
  )
  assert.equal(created.status(), 200)
  projectId = (await created.json()).data.id

  for (const person of Object.values(people)) {
    await person.page.goto(
      `${origin}/redraw?workspace=${workspace}&project=${projectId}`
    )
    await expect(
      ui(person).locator('.redraw-viewport [data-element]')
    ).toHaveCount(2)
  }
  await expect(
    ui(people.owner).getByText('Redraw editor', { exact: true })
  ).toBeVisible()
  await expect(
    ui(people.viewer).getByRole('textbox', {
      name: 'Project title',
      exact: true
    })
  ).toBeDisabled()
  await Promise.all([
    textEdit(people.owner, alpha.id, 'Owner edit'),
    textEdit(people.editor, beta.id, 'Editor edit')
  ])
  await Promise.all([saved(people.owner), saved(people.editor)])
  await expect
    .poll(async () =>
      (await getProject()).document.pages[0].elements.map(e => e.text)
    )
    .toEqual(['Owner edit', 'Editor edit'])
  await ui(people.owner)
    .getByRole('button', { name: 'Undo', exact: true })
    .click()
  await saved(people.owner)
  assert.equal(
    (await getProject()).document.pages[0].elements[1].text,
    'Editor edit'
  )
  const bounds = await ui(people.editor)
    .locator('.redraw-viewport')
    .boundingBox()
  await people.editor.page.mouse.move(bounds.x + 150, bounds.y + 160)
  await expect(ui(people.owner).locator('[data-peer] path')).toHaveCount(1)
  console.log('Live editing, local undo, presence and viewer controls passed.')

  await people.owner.page.route('**/collaboration/sync*', route =>
    route.abort()
  )
  await textEdit(people.owner, alpha.id, 'Offline draft')
  await expect(ui(people.owner).getByRole('status')).toHaveText(
    'Could not save',
    { timeout: 15000 }
  )
  await textEdit(people.editor, beta.id, 'Remote during disconnect')
  await saved(people.editor)
  await people.owner.page.unroute('**/collaboration/sync*')
  await saved(people.owner)
  await expect
    .poll(async () =>
      (await getProject()).document.pages[0].elements.map(e => e.text)
    )
    .toEqual(['Offline draft', 'Remote during disconnect'])
  console.log('Reconnect merges the retained draft with remote edits.')

  // The API applies the edit, but its response is lost. A retry must not apply it twice.
  await people.owner.page.route('**/collaboration/sync*', async route => {
    await route.fetch()
    await route.abort()
  })
  await textEdit(people.owner, alpha.id, 'Lost acknowledgement')
  await expect
    .poll(async () => (await getProject()).document.pages[0].elements[0].text, {
      timeout: 15000
    })
    .toBe('Lost acknowledgement')
  const acknowledgedRevision = (await getProject()).revision
  await people.owner.page.unroute('**/collaboration/sync*')
  await saved(people.owner)
  assert.equal((await getProject()).revision, acknowledgedRevision)
  console.log('A lost acknowledgement retries without duplicate writes.')

  await select(people.owner, alpha.id)
  await ui(people.owner)
    .locator(`[data-layer="${beta.id}"] button`)
    .first()
    .click({ modifiers: ['Shift'] })
  await ui(people.owner)
    .getByRole('textbox', { name: 'Component name', exact: true })
    .fill('Reusable card')
  await ui(people.owner)
    .getByRole('button', { name: 'Create component', exact: true })
    .click()
  await saved(people.owner)
  await ui(people.owner)
    .getByRole('button', { name: 'Insert Reusable card', exact: true })
    .click()
  await saved(people.owner)
  await ui(people.owner)
    .getByRole('button', { name: 'Insert Reusable card', exact: true })
    .click()
  await saved(people.owner)
  let project = await getProject()

  const parts = project.document.pages[0].elements.filter(
      e => e.component && e.name === 'Alpha'
    ),
    first = parts[0],
    second = parts[1]
  assert.equal(parts.length, 2)
  await textEdit(people.owner, second.id, 'Local override')
  await saved(people.owner)
  await textEdit(people.owner, first.id, 'Shared component update')
  await ui(people.owner)
    .getByRole('button', { name: 'Update main component', exact: true })
    .click()
  await saved(people.owner)
  project = await getProject()
  assert.equal(
    project.document.pages[0].elements.find(e => e.id === first.id).text,
    'Shared component update'
  )
  assert.equal(
    project.document.pages[0].elements.find(e => e.id === second.id).text,
    'Local override'
  )
  await select(people.owner, second.id)
  await ui(people.owner)
    .getByRole('button', { name: 'Reset overrides', exact: true })
    .click()
  await saved(people.owner)
  assert.equal(
    (await getProject()).document.pages[0].elements.find(
      e => e.id === second.id
    ).text,
    'Shared component update'
  )
  await ui(people.owner)
    .getByRole('button', { name: 'Detach instance', exact: true })
    .click()
  await saved(people.owner)
  assert.equal(
    (await getProject()).document.pages[0].elements.find(
      e => e.id === second.id
    ).component,
    undefined
  )
  console.log(
    'Reusable component insertion, propagation, overrides, reset and detach passed.'
  )

  await select(people.owner, alpha.id)
  await ui(people.owner)
    .locator(`[data-layer="${beta.id}"] button`)
    .first()
    .click({ modifiers: ['Shift'] })
  await ui(people.owner)
    .getByRole('button', { name: 'Wrap in auto-layout', exact: true })
    .click()
  await ui(people.owner)
    .getByRole('textbox', { name: 'Gap', exact: true })
    .fill('40')
  await saved(people.owner)
  project = await getProject()
  const laidOut = project.document.pages[0].elements
  assert.equal(
    laidOut.find(e => e.id === beta.id).x -
      laidOut.find(e => e.id === alpha.id).x,
    alpha.width + 40
  )
  const inspector = ui(people.owner).getByRole('complementary', {
    name: 'Properties',
    exact: true
  })
  await inspector.getByText('Horizontal', { exact: true }).click()
  await people.owner.page
    .getByRole('option', { name: 'Vertical', exact: true })
    .click()
  await saved(people.owner)
  project = await getProject()
  assert.equal(
    project.document.pages[0].elements.find(e => e.id === beta.id).y -
      project.document.pages[0].elements.find(e => e.id === alpha.id).y,
    alpha.height + 40
  )
  await people.owner.page.screenshot({
    path: resolve(artifacts, 'shared-layout-components.png')
  })
  await people.owner.page.setViewportSize({ width: 390, height: 844 })
  await ui(people.owner)
    .getByRole('button', { name: 'Properties', exact: true })
    .click()
  await expect(
    ui(people.owner).getByRole('complementary', {
      name: 'Properties',
      exact: true
    })
  ).toBeVisible()
  assert.ok(
    await people.owner.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    ),
    'Multiplayer controls fit the narrow layout'
  )
  await people.owner.page.screenshot({
    path: resolve(artifacts, 'mobile-layout.png')
  })
  await ui(people.owner)
    .getByRole('button', { name: 'Properties', exact: true })
    .click()
  await people.owner.page.setViewportSize({ width: 1660, height: 1150 })

  await people.editor.page.route('**/collaboration/sync*', route =>
    route.abort()
  )
  await textEdit(people.editor, beta.id, 'Draft through role change')
  await expect(ui(people.editor).getByRole('status')).toHaveText(
    'Could not save',
    { timeout: 15000 }
  )
  await sql`update zillion_databases__workspace_members set role='viewer' where workspace_id=${workspace} and user_id=${people.editor.id}`
  await people.editor.page.unroute('**/collaboration/sync*')
  await expect(
    ui(people.editor).getByRole('textbox', {
      name: 'Project title',
      exact: true
    })
  ).toBeDisabled({ timeout: 15000 })
  await textEdit(people.owner, alpha.id, 'Owner after role change')
  await saved(people.owner)
  await expect(
    ui(people.editor).locator(`[data-element="${alpha.id}"]`)
  ).toContainText(/Owner after role\s*change/, { timeout: 15000 })
  await sql`update zillion_databases__workspace_members set role='editor' where workspace_id=${workspace} and user_id=${people.editor.id}`
  await expect(
    ui(people.editor).getByRole('textbox', {
      name: 'Project title',
      exact: true
    })
  ).toBeEnabled({ timeout: 15000 })
  await saved(people.editor)
  assert.equal(
    (await getProject()).document.pages[0].elements.find(e => e.id === beta.id)
      .text,
    'Draft through role change'
  )
  await sql`update zillion_databases__workspace_members set role='editor' where workspace_id=${workspace} and user_id=${people.viewer.id}`
  await expect(
    ui(people.viewer).getByRole('textbox', {
      name: 'Project title',
      exact: true
    })
  ).toBeEnabled({ timeout: 15000 })
  console.log(
    'Auto-layout, narrow layout, live permission changes and retained drafts passed.'
  )

  for (const [name, buffer] of [
    ['native.penpot', penpotFixture()],
    ['native.fig', figFixture()]
  ]) {
    await ui(people.owner)
      .getByRole('button', { name: 'Back to projects', exact: true })
      .click()
    await expect(ui(people.owner).locator('h1')).toHaveText('Redraw')
    await ui(people.owner)
      .locator('input[type="file"]')
      .setInputFiles({
        name,
        mimeType: 'application/octet-stream',
        buffer: Buffer.from(buffer)
      })
    await expect(
      ui(people.owner).getByRole('region', {
        name: 'Review import',
        exact: true
      })
    ).toBeVisible({ timeout: 20000 })
    await people.owner.page.screenshot({
      path: resolve(artifacts, `${name}-review.png`)
    })
    await ui(people.owner)
      .getByRole('button', { name: 'Import into workspace', exact: true })
      .click()
    await expect(ui(people.owner).locator('.redraw-viewport')).toBeVisible()
    const importedId = new URL(people.owner.page.url()).searchParams.get(
      'project'
    )
    const imported = await getProject(importedId)
    assert.ok(imported.document.pages[0].elements.length)
    if (name.endsWith('.fig'))
      assert.equal(
        imported.document.pages[0].elements[0].text,
        'Editable Figma text'
      )
  }
  assert.deepEqual(errors, [])
  console.log(
    'Redraw multiplayer acceptance passed, including native Penpot/Figma review and import; no browser errors.'
  )
} catch (error) {
  if (people.owner.page)
    await people.owner.page
      .screenshot({ path: resolve(artifacts, 'failure.png') })
      .catch(() => {})
  throw error
} finally {
  await Promise.all(
    Object.values(people).map(person => person.context?.close())
  )
  await browser.close()
  await sql`delete from zillion_databases__workspaces where id=${workspace} and owner_id=${people.owner.id}`

  for (const person of Object.values(people)) {
    await sql`delete from auth__refresh_tokens where user_id=${person.id}`
    await sql`delete from users where id=${person.id}`
  }
  await sql.end()
}
