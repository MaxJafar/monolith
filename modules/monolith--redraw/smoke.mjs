// Uses the repository's synthetic local review account. Cleans up only its own projects.
import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect } from '@playwright/test'
import dotenv from 'dotenv'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const require = createRequire(resolve(root, 'apps/api/package.json'))
const postgres = require('postgres')
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_ADMIN_URL || '')

if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.port !== '55432' ||
  !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(database.pathname)
)
  throw Error('Use the isolated local development database')

const sql = postgres(database.href, { max: 1 })
const fixture = JSON.parse(
  readFileSync(resolve(root, '.temp/monolith-review-fixture.json'), 'utf8')
)
const api = 'http://localhost:3636',
  origin = 'http://localhost:5173'
const remote = resolveAddonIdentity({ name: '@monolith/redraw' }).remoteId
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  acceptDownloads: true
})
await context.route(
  /https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)/,
  route => route.abort()
)
const errors = [],
  ids = [],
  label = `Redraw acceptance ${randomUUID()}`

let page, workspace, headers

const artifacts = resolve(root, '.temp/redraw-acceptance')
mkdirSync(artifacts, { recursive: true })

async function request(route, body, extra = {}) {
  const result = await context.request.fetch(
    `${api}/modules/${remote}/projects/${route}?${new URLSearchParams({ workspace_id: workspace, ...extra })}`,
    { method: body === undefined ? 'GET' : 'POST', headers, data: body }
  )
  assert.ok(
    result.ok(),
    `${route}: ${result.status()} ${(await result.text()).slice(0, 500)}`
  )

  return (await result.json()).data
}

async function saved() {
  await expect(page.locator('.redraw-editor').getByRole('status')).toHaveText(
    'All changes saved',
    { timeout: 15000 }
  )
}

async function selectLayer(name) {
  await page
    .locator('.redraw')
    .getByRole('complementary', { name: 'Layers', exact: true })
    .getByRole('button', { name, exact: true })
    .click()
}

async function bundledToolIcons() {
  const buttons = page.locator('.redraw [role="toolbar"] button')

  for (let index = 0; index < (await buttons.count()); index++) {
    const button = buttons.nth(index)
    await expect(
      button.locator('svg'),
      `Bundled icon: ${await button.getAttribute('aria-label')}`
    ).toHaveCount(1)
  }
}

try {
  const login = await context.request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` }
  const spaces = await context.request.get(
    `${api}/modules/${remote}/workspaces`,
    { headers }
  )
  assert.equal(spaces.status(), 200)
  workspace = (await spaces.json()).data.find(s => s.is_default).id
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (
      response.url().includes(`/modules/${remote}/projects/create`) &&
      response.ok()
    )
      void response.json().then(json => ids.push(json.data.id))
  })
  await page.goto(`${origin}/module-manager/modules?workspace=${workspace}`)
  await expect(page.getByText('Redraw', { exact: true }).first()).toBeVisible()
  await page.goto(`${origin}/redraw?workspace=${workspace}`)
  await expect(page.locator('.redraw h1')).toHaveText('Redraw')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Mind map', exact: true })
    .click()
  await expect(page.locator('.redraw-viewport')).toBeVisible()
  await bundledToolIcons()
  const project = new URL(page.url()).searchParams.get('project')
  assert.ok(project)
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Project title', exact: true })
    .fill(label)
  await selectLayer('The big idea')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Add branch', exact: true })
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(5)
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Undo', exact: true })
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(4)
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Redo', exact: true })
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(5)
  await selectLayer('New idea')
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Text', exact: true })
    .fill('An interactive idea')
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Renamed branch')
  await saved()
  let doc = await request('get', undefined, { id: project })
  assert.equal(
    doc.document.pages[0].elements.find(e => e.name === 'Renamed branch').text,
    'An interactive idea'
  )
  assert.equal(doc.document.pages[0].connectors.length, 4)
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Fit to content', exact: true })
    .click()
  await page.screenshot({ path: resolve(artifacts, 'blackboard.png') })
  const node = page.locator(
    `[data-element="${doc.document.pages[0].elements[0].id}"]`
  )
  const box = await node.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 35,
    { steps: 5 }
  )
  await page.mouse.up()
  await saved()
  const moved = await request('get', undefined, { id: project })
  assert.notEqual(
    moved.document.pages[0].elements[0].x,
    doc.document.pages[0].elements[0].x
  )
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Canvas', exact: true })
    .first()
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(0)
  await bundledToolIcons()
  const stage = page.locator('.redraw-viewport'),
    bounds = await stage.boundingBox()
  assert.ok(bounds)
  await page
    .locator('.redraw')
    .getByRole('toolbar', { name: 'Drawing tools' })
    .getByRole('button', { name: 'Rectangle', exact: true })
    .click()
  await page.mouse.move(bounds.x + 120, bounds.y + 120)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 340, bounds.y + 270, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(1)
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Text', exact: true })
    .fill('Canvas design')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(2)
  await stage.focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+g')
  await saved()
  doc = await request('get', undefined, { id: project })
  assert.equal(doc.document.pages.length, 2)
  assert.ok(
    doc.document.pages[1].elements.every(
      e => e.group === doc.document.pages[1].elements[0].group
    )
  )
  // Reopening in the same session must not initialize from a stale cached revision.
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click()
  await expect(page.locator('.redraw h1')).toHaveText('Redraw')
  await page.locator('.redraw').getByText(label, { exact: true }).click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Canvas', exact: true })
    .first()
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(2)
  await stage.focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('ArrowRight')
  await saved()
  const reopened = await request('get', undefined, { id: project })
  assert.equal(
    reopened.document.pages[1].elements[0].x,
    doc.document.pages[1].elements[0].x + 1
  )
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Export', exact: true })
    .click()
  const svgDownload = page.waitForEvent('download')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'SVG', exact: true })
    .click()
  const svg = await svgDownload
  await svg.saveAs(resolve(artifacts, 'canvas.svg'))
  assert.ok(
    readFileSync(resolve(artifacts, 'canvas.svg'), 'utf8').includes('Canvas')
  )
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Export', exact: true })
    .click()
  const pngDownload = page.waitForEvent('download')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'PNG', exact: true })
    .click()
  await (await pngDownload).saveAs(resolve(artifacts, 'canvas.png'))
  assert.ok(readFileSync(resolve(artifacts, 'canvas.png')).length > 100)
  await page.screenshot({ path: resolve(artifacts, 'canvas-editor.png') })
  await page.reload()
  await expect(page.locator('.redraw-viewport')).toBeVisible()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Canvas', exact: true })
    .first()
    .click()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Properties', exact: true })
    .click()
  await expect(
    page
      .locator('.redraw')
      .getByRole('complementary', { name: 'Properties', exact: true })
  ).toBeVisible()
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    ),
    'No horizontal page overflow on mobile'
  )
  await page.screenshot({ path: resolve(artifacts, 'mobile.png') })
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Properties', exact: true })
    .click()
  await page.setViewportSize({ width: 1600, height: 1100 })
  // Import an actual raster export, lock it, and verify Delete respects the lock.
  await page
    .locator('.redraw input[type="file"]')
    .setInputFiles(resolve(artifacts, 'canvas.png'))
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(3)
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Lock', exact: true })
    .click()
  await stage.focus()
  await page.keyboard.press('Delete')
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(3)
  await saved()
  doc = await request('get', undefined, { id: project })
  assert.ok(
    doc.document.pages[1].elements.find(e => e.kind === 'image')?.locked
  )
  assert.match(
    doc.document.pages[1].elements.find(e => e.kind === 'image').image,
    /^data:image\/png;base64,/
  )
  // A canceled drawing gesture creates neither a stored object nor a history entry.
  await page
    .locator('.redraw')
    .getByRole('toolbar', { name: 'Drawing tools' })
    .getByRole('button', { name: 'Rectangle', exact: true })
    .click()
  const drawBox = await stage.boundingBox()
  await page.mouse.move(drawBox.x + 90, drawBox.y + 90)
  await page.mouse.down()
  await page.mouse.move(drawBox.x + 180, drawBox.y + 180)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('.redraw-viewport [data-element]')).toHaveCount(3)
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Export', exact: true })
    .click()
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page
      .locator('.redraw')
      .getByRole('button', { name: 'Redraw file (.json)', exact: true })
      .click()
  ])
  await jsonDownload.saveAs(resolve(artifacts, 'project.redraw.json'))
  // Shared editing merges a competing revision before handling a disconnected draft.
  doc = await request('get', undefined, { id: project })
  await request('save', {
    id: project,
    expected_revision: doc.revision,
    title: doc.title,
    document: doc.document
  })
  await page.route('**/collaboration/sync*', route => route.abort())
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Project title', exact: true })
    .fill(label + ' draft')
  await expect(page.locator('.redraw-editor').getByRole('status')).toHaveText(
    'Could not save',
    { timeout: 15000 }
  )
  await expect(
    page
      .locator('.redraw')
      .getByRole('textbox', { name: 'Project title', exact: true })
  ).toHaveValue(label + ' draft')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click()
  await expect(
    page
      .locator('.redraw')
      .getByRole('button', { name: 'Keep editing', exact: true })
  ).toBeVisible()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Leave without saving', exact: true })
    .click()
  await expect(page.locator('.redraw h1')).toHaveText('Redraw')
  await page.unroute('**/collaboration/sync*')
  await page
    .locator('.redraw')
    .getByRole('button', { name: `Archive ${label}`, exact: true })
    .click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Archive', exact: true })
    .click()
  await expect(
    page
      .locator('.redraw')
      .getByRole('button', { name: `Restore ${label}`, exact: true })
  ).toBeVisible()
  await page
    .locator('.redraw')
    .getByRole('button', { name: `Restore ${label}`, exact: true })
    .click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Archive', exact: true })
    .click()
  await page
    .locator('.redraw input[type="file"]')
    .setInputFiles(resolve(artifacts, 'project.redraw.json'))
  await expect(stage).toBeVisible()
  const importedId = new URL(page.url()).searchParams.get('project')
  assert.notEqual(importedId, project)
  const imported = await request('get', undefined, { id: importedId })
  assert.equal(imported.document.pages[1].elements.length, 3)
  assert.notEqual(imported.document.pages[0].id, doc.document.pages[0].id)
  const wasDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark')
  )
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.screenshot({ path: resolve(artifacts, 'dark.png') })
  if (!wasDark)
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
  // A second edit during a slow save must survive Save and leave.
  let delayed = false
  await page.route('**/collaboration/sync*', async route => {
    if (!delayed) {
      delayed = true
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    await route.continue()
  })
  const saving = page.waitForRequest(request =>
    request.url().includes('/collaboration/sync')
  )
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Project title', exact: true })
    .fill('First imported edit')
  await saving
  await page
    .locator('.redraw')
    .getByRole('textbox', { name: 'Project title', exact: true })
    .fill('Latest imported edit')
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click()
  await page
    .locator('.redraw')
    .getByRole('button', { name: 'Save and leave', exact: true })
    .click()
  await expect(page.locator('.redraw h1')).toHaveText('Redraw')
  assert.equal(
    (await request('get', undefined, { id: importedId })).title,
    'Latest imported edit'
  )
  assert.deepEqual(errors, [])
  console.log(
    'Redraw acceptance passed: addon discovery, dashboard, templates, branches, editing, undo/redo, dragging, two modes, grouping, reopen/reload, SVG/PNG/JSON round-trip, raster imports, locking, gesture cancel, mobile/dark layouts, conflict recovery, archive/restore and edits during saving; no browser errors.'
  )
} catch (error) {
  if (page)
    await page
      .screenshot({ path: resolve(artifacts, 'failure.png'), fullPage: true })
      .catch(() => {})
  throw error
} finally {
  for (const id of new Set(ids))
    await sql`delete from redraw__projects where id=${id} and workspace_id=${workspace}`
  await context.close()
  await browser.close()
  await sql.end()
}
