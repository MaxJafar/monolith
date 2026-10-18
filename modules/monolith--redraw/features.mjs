// Real browser and HTTP coverage. Only synthetic users and workspaces created here are modified.
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
import { toVector } from './vector.ts'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_ADMIN_URL || '')
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.port !== '55432' ||
  !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(database.pathname)
)
  throw Error('Use the isolated local development database')
const require = createRequire(resolve(root, 'apps/api/package.json')),
  sql = require('postgres')(database.href, { max: 1 })
const remote = resolveAddonIdentity({ name: '@monolith/redraw' }).remoteId,
  core = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
const origin = 'http://localhost:5173',
  api = 'http://localhost:3636',
  workspace = randomUUID(),
  otherWorkspace = randomUUID(),
  password = `Fixture-${randomUUID()}!`
// Optionally exercise a freshly built gateway without replacing the running service.
const testGateway = process.env.REDRAW_TEST_GATEWAY_URL
if (
  testGateway &&
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(testGateway).hostname)
)
  throw Error('The acceptance gateway must be local')
const artifacts = resolve(root, '.temp/redraw-v3-acceptance')
mkdirSync(artifacts, { recursive: true })
const browser = await chromium.launch({ headless: true }),
  errors = []
const people = Object.fromEntries(
  ['owner', 'editor', 'viewer', 'outsider'].map(role => [
    role,
    { id: randomUUID(), token: '', context: null, page: null }
  ])
)
let projectId, pageId
const doc = makeDocument('canvas', 'Canvas')
const start = {
  ...makeElement('frame', { x: 0, y: 0 }, 'Start screen'),
  width: 480,
  height: 360,
  clipContent: true
}
const end = {
  ...makeElement('frame', { x: 650, y: 0 }, 'Destination'),
  width: 480,
  height: 360
}
const button = {
  ...makeElement('rectangle', { x: 90, y: 100 }, 'Continue'),
  width: 220,
  height: 70,
  text: 'Continue',
  parent: start.id,
  prototype: {
    trigger: 'click',
    action: 'navigate',
    target: end.id,
    transition: 'dissolve',
    duration: 100
  }
}
const back = {
  ...makeElement('rectangle', { x: 740, y: 100 }, 'Back'),
  width: 220,
  height: 70,
  text: 'Back',
  parent: end.id,
  prototype: {
    trigger: 'click',
    action: 'back',
    target: null,
    transition: 'instant',
    duration: 0
  }
}
const vector = toVector({
  ...makeElement('ellipse', { x: 100, y: 230 }, 'Editable vector'),
  width: 130,
  height: 80,
  parent: start.id
})
doc.pages[0].elements = [start, end, button, back, vector]
doc.prototypeStart = start.id
const title = `Redraw v3 ${randomUUID().slice(0, 8)}`

async function call(
  person,
  route,
  data,
  query = {},
  module = remote,
  expected = 200
) {
  const response = await person.context.request.fetch(
    `${api}/modules/${module}/${route}?${new URLSearchParams({ workspace_id: workspace, ...query })}`,
    {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${person.token}` },
      data
    }
  )
  assert.equal(
    response.status(),
    expected,
    `${route}: ${response.status()} ${(await response.text()).slice(0, 400)}`
  )
  return expected === 200 ? (await response.json()).data : null
}
const project = () =>
  call(people.owner, 'projects/get', undefined, { id: projectId })
const ui = person => person.page.locator('.redraw-editor')
const saved = person =>
  expect(ui(person).getByRole('status')).toHaveText('All changes saved', {
    timeout: 15000
  })
async function select(person, id) {
  await ui(person).locator(`[data-layer="${id}"] button`).first().dblclick()
}

try {
  const passwordHash = await hash(password, 4)
  for (const [role, person] of Object.entries(people)) {
    const email = `redraw-features-${person.id}@example.invalid`
    await sql`insert into users (id,email,username,name,auth_password_hash) values (${person.id},${email},${'redraw-' + person.id},${'Review ' + role},${passwordHash})`
    person.context = await browser.newContext({
      viewport: { width: 1700, height: 1200 }
    })
    if (testGateway)
      await person.context.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url())
        const response = await route.fetch({
          url: `${testGateway}${url.pathname}${url.search}`
        })
        await route.fulfill({ response })
      })
    const login = await person.context.request.post(`${api}/auth/login`, {
      data: { email, password }
    })
    assert.equal(login.status(), 200)
    person.token = (await login.json()).data.accessToken
    person.page = await person.context.newPage()
    person.page.on('pageerror', error => errors.push(error.message))
    person.page.on('console', message => {
      if (
        message.type() === 'warning' &&
        message.text().includes('Dev mode import')
      )
        console.log(message.text().slice(0, 800))
    })
  }
  for (const id of [workspace, otherWorkspace])
    await sql`insert into zillion_databases__workspaces (id,owner_id,name,enabled_modules) values (${id},${people.owner.id},'Redraw feature acceptance','["redraw","atlas"]'::jsonb)`
  for (const role of ['editor', 'viewer'])
    await sql`insert into zillion_databases__workspace_members (owner_id,workspace_id,user_id,role) values (${people.owner.id},${workspace},${people[role].id},${role})`
  projectId = (
    await call(people.owner, 'projects/create', { title, document: doc })
  ).id
  for (const role of ['owner', 'editor', 'viewer']) {
    await people[role].page.goto(
      `${origin}/redraw/${projectId}?workspace=${workspace}`
    )
    await expect(
      ui(people[role]).locator('.redraw-viewport [data-element]')
    ).toHaveCount(5, { timeout: 45000 })
  }
  const owner = people.owner,
    page = owner.page
  await ui(owner)
    .getByRole('button', { name: 'Open fullscreen', exact: true })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains('redraw-editor')
      )
    )
    .toBe(true)
  await page.screenshot({ path: resolve(artifacts, 'fullscreen.png') })
  await ui(owner)
    .getByRole('button', { name: 'Exit fullscreen', exact: true })
    .click()
  await ui(owner)
    .getByRole('button', { name: 'Present prototype', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Prototype preview' })
  ).toBeVisible()
  await expect(page.locator('.redraw-prototype-scene')).toHaveAttribute(
    'viewBox',
    '0 0 480 360'
  )
  await page.locator(`[data-hotspot="${button.id}"]`).click()
  await expect(page.locator('.redraw-prototype-scene')).toHaveAttribute(
    'viewBox',
    '650 0 480 360'
  )
  await page.locator(`[data-hotspot="${back.id}"]`).click()
  await expect(page.locator('.redraw-prototype-scene')).toHaveAttribute(
    'viewBox',
    '0 0 480 360'
  )
  await page.screenshot({ path: resolve(artifacts, 'prototype.png') })
  await page.getByRole('button', { name: 'Close preview', exact: true }).click()
  console.log('Fullscreen and prototype navigation passed')

  await select(owner, vector.id)
  await ui(owner)
    .getByRole('button', { name: 'Edit vector nodes', exact: true })
    .click()
  const anchor = ui(owner).locator('[data-vector-handle="anchor"]').first(),
    original = vector.vector[0].nodes[0]
  const box = await anchor.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    box.x + box.width / 2 + 28,
    box.y + box.height / 2 + 18,
    { steps: 5 }
  )
  await page.mouse.up()
  await saved(owner)
  const moved = (await project()).document.pages[0].elements.find(
    e => e.id === vector.id
  ).vector[0].nodes[0]
  assert.notEqual(moved.x, original.x)
  await ui(owner).getByRole('button', { name: 'Undo', exact: true }).click()
  await saved(owner)
  assert.equal(
    (await project()).document.pages[0].elements.find(e => e.id === vector.id)
      .vector[0].nodes[0].x,
    original.x
  )
  await select(owner, vector.id)
  await ui(owner).locator('[data-vector-handle="anchor"]').first().click()
  await ui(owner)
    .getByRole('button', { name: 'Symmetric', exact: true })
    .click()
  await ui(owner)
    .getByRole('button', { name: 'Add node on next segment', exact: true })
    .click()
  await saved(owner)
  assert.equal(
    (await project()).document.pages[0].elements.find(e => e.id === vector.id)
      .vector[0].nodes.length,
    5
  )
  await page.screenshot({ path: resolve(artifacts, 'vector-nodes.png') })
  await ui(owner)
    .getByRole('button', { name: 'Done editing nodes', exact: true })
    .click()
  console.log('Vector handles, curve splitting and undo passed')

  await ui(owner).getByRole('button', { name: 'Comments', exact: true }).click()
  await ui(owner)
    .getByRole('button', { name: 'Pin a comment', exact: true })
    .click()
  await ui(owner).locator(`[data-element="${button.id}"]`).click()
  await ui(owner)
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Please review this interaction')
  await ui(owner)
    .getByRole('button', { name: 'Post comment', exact: true })
    .click()
  await expect(
    ui(owner).getByText('Please review this interaction', { exact: true })
  ).toBeVisible()
  const scope = { project_id: projectId }
  await expect
    .poll(
      async () => (await call(owner, 'comments/list', undefined, scope)).length
    )
    .toBe(1)
  const threads = await call(owner, 'comments/list', undefined, scope),
    thread = threads[0]
  assert.equal(thread.actor_id, owner.id)
  assert.equal(thread.name, 'Review owner')
  const reply = {
    id: randomUUID(),
    page_id: doc.pages[0].id,
    element_id: null,
    parent_id: thread.id,
    x: 0,
    y: 0,
    body: 'Looks good to me',
    name: 'Forged name',
    actor_id: owner.id
  }
  await call(people.viewer, 'comments/create', reply, scope, remote, 403)
  await call(people.outsider, 'comments/list', undefined, scope, remote, 404)
  await call(
    owner,
    'comments/list',
    undefined,
    { ...scope, workspace_id: otherWorkspace },
    remote,
    404
  )
  const posted = await call(people.editor, 'comments/create', reply, scope)
  assert.equal(posted.actor_id, people.editor.id)
  assert.equal(posted.name, 'Review editor')
  await call(people.editor, 'comments/create', reply, scope)
  assert.equal((await call(owner, 'comments/list', undefined, scope)).length, 2)
  await call(
    people.editor,
    'comments/remove',
    { id: thread.id },
    scope,
    remote,
    403
  )
  await expect(
    ui(owner).getByText('Looks good to me', { exact: true })
  ).toBeVisible({ timeout: 10000 })
  await ui(owner)
    .getByRole('button', { name: 'Resolve thread', exact: true })
    .click()
  await expect
    .poll(
      async () =>
        (await call(owner, 'comments/list', undefined, scope))[0].resolved
    )
    .toBe(true)
  await ui(owner)
    .getByRole('button', { name: 'Reopen thread', exact: true })
    .click()
  await page.screenshot({ path: resolve(artifacts, 'comments.png') })
  await ui(owner)
    .getByRole('button', { name: 'Close panel', exact: true })
    .click()
  console.log('Comments, live replies, idempotency and access controls passed')

  await ui(owner).locator('.redraw-viewport').focus()
  await page.keyboard.press('Escape')
  await ui(owner)
    .getByRole('textbox', { name: 'File tag', exact: true })
    .fill('launch')
  await ui(owner).getByRole('button', { name: 'Add tag', exact: true }).click()
  await saved(owner)
  const resources = await call(
    owner,
    'workspaceGraph/resources',
    undefined,
    {},
    core
  )
  assert.ok(
    resources.some(
      file => file.id === projectId && file.tags.includes('launch')
    )
  )
  assert.equal(
    (
      await call(
        owner,
        'workspaceGraph/resources',
        undefined,
        { workspace_id: otherWorkspace },
        core
      )
    ).length,
    0
  )
  await call(
    people.outsider,
    'workspaceGraph/resources',
    undefined,
    {},
    core,
    404
  )
  pageId = randomUUID()
  await call(
    owner,
    'workspaces/savePage',
    {
      id: pageId,
      workspace_id: workspace,
      parent_id: null,
      expected_revision: 0,
      page: {
        version: 1,
        title: 'Redraw mention acceptance',
        icon: 'lucide:file-text',
        fullWidth: true,
        revision: 0,
        updated: null,
        blocks: [
          {
            id: randomUUID(),
            type: 'document',
            title: '',
            content: 'Design review',
            width: 'full',
            url: '',
            widget: ''
          }
        ]
      }
    },
    {},
    core
  )
  await page.goto(`${origin}/page/${pageId}?workspace=${workspace}`)
  const legacy = page.getByRole('textbox', {
    name: 'Document blocks',
    exact: true
  })
  await expect(legacy).toBeVisible({ timeout: 45000 })
  await legacy.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await page.getByRole('button', { name: 'Link a page', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Find a page', exact: true })
    .fill('launch')
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(legacy.locator(`[data-page-id="${projectId}"]`)).toBeVisible()
  await expect
    .poll(
      async () =>
        JSON.stringify(
          (
            await call(
              owner,
              'workspaces/getPage',
              undefined,
              { id: pageId },
              core
            )
          ).page.body
        ).includes(projectId),
      { timeout: 15000 }
    )
    .toBe(true)
  await page.reload()
  await expect(legacy.locator(`[data-page-id="${projectId}"]`)).toBeVisible({
    timeout: 45000
  })
  await page.screenshot({ path: resolve(artifacts, 'legacy-page-mention.png') })
  await legacy.locator(`[data-page-id="${projectId}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/redraw/${projectId}`))
  await expect(ui(owner)).toBeVisible()
  console.log('Legacy page references persist and open the Redraw file')

  // Enable the canonical editor only for this disposable acceptance workspace.
  // Its normal first-edit initialization converts the saved legacy reference.
  await sql`insert into monolith_editor_rollouts (workspace_id,enabled) values (${workspace},true)`
  await page.goto(`${origin}/page/${pageId}?workspace=${workspace}`)
  const paragraph = page.locator('editor-host affine-paragraph').first()
  await expect(paragraph).toBeVisible({ timeout: 45000 })
  await paragraph.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' @launch', { delay: 90 })
  const mention = page.getByRole('listbox', {
    name: 'Mention a page or Redraw file'
  })
  await expect(mention).toBeVisible()
  await mention.getByRole('option', { name: new RegExp(title) }).click()
  await expect(
    page.locator(`editor-host a[href*="/redraw/${projectId}"]`)
  ).toHaveCount(2)
  await expect
    .poll(
      async () =>
        (
          await call(owner, 'workspaceGraph/snapshot', undefined, {}, core)
        ).edges.some(
          edge =>
            edge.source === `document:${pageId}` &&
            edge.target === `redraw:${projectId}`
        ),
      { timeout: 15000 }
    )
    .toBe(true)
  await page.reload()
  const link = page
    .locator(`editor-host a[href*="/redraw/${projectId}"]`)
    .last()
  await expect(link).toBeVisible({ timeout: 45000 })
  await page.screenshot({ path: resolve(artifacts, 'page-mention.png') })
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/redraw/${projectId}`))
  await expect(ui(owner)).toBeVisible()
  console.log(
    'Workspace tags, canonical page mentions, reload, backlinks and navigation passed'
  )

  await page.setViewportSize({ width: 390, height: 844 })
  const exportBounds = await ui(owner)
    .getByRole('button', { name: 'Export', exact: true })
    .boundingBox()
  assert.ok(
    exportBounds &&
      exportBounds.x >= 0 &&
      exportBounds.x + exportBounds.width <= 390,
    'Header controls fit the narrow viewport'
  )
  await ui(owner).getByRole('button', { name: 'Comments', exact: true }).click()
  await expect(
    page
      .getByRole('complementary', { name: 'Comments', exact: true })
      .filter({ visible: true })
  ).toBeVisible()
  await ui(owner)
    .getByRole('button', { name: 'Pin a comment', exact: true })
    .click()
  await expect(
    page.getByRole('complementary', { name: 'Comments', exact: true })
  ).toHaveCount(0)
  await ui(owner)
    .locator('.redraw-viewport')
    .click({ position: { x: 150, y: 50 } })
  await ui(owner)
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Pinned from the mobile canvas')
  await ui(owner)
    .getByRole('button', { name: 'Post comment', exact: true })
    .click()
  await expect
    .poll(async () =>
      (await call(owner, 'comments/list', undefined, scope)).some(
        comment => comment.body === 'Pinned from the mobile canvas'
      )
    )
    .toBe(true)
  await expect(
    ui(owner).getByRole('textbox', { name: 'Comment', exact: true })
  ).toHaveValue('')
  await expect(
    ui(owner).getByText('Pinned from the mobile canvas', { exact: true })
  ).toBeVisible()
  await page
    .getByRole('complementary', { name: 'Comments', exact: true })
    .evaluate(panel => {
      panel.scrollTop = 0
    })
  await page.screenshot({ path: resolve(artifacts, 'mobile-comments.png') })
  assert.deepEqual(errors, [])
  console.log('Redraw v3 acceptance passed with no browser errors')
} catch (error) {
  console.log('Browser errors:', errors)
  await people.owner.page
    ?.screenshot({ path: resolve(artifacts, 'failure.png') })
    .catch(() => {})
  throw error
} finally {
  for (const person of Object.values(people)) await person.context?.close()
  await browser.close()
  await sql`delete from zillion_databases__workspaces where id in (${workspace},${otherWorkspace}) and owner_id=${people.owner.id}`
  for (const person of Object.values(people)) {
    await sql`delete from auth__refresh_tokens where user_id=${person.id}`
    await sql`delete from users where id=${person.id}`
  }
  await sql.end()
}
