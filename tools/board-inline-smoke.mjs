import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1480, height: 1080 }
})
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
let result = { engine, passed: false }
let stage = 'setup'
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  async function call(route, data, query = {}) {
    const response = await context.request.fetch(
      `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    assert.ok(
      response.ok(),
      `${route}: ${response.status()} ${response.ok() ? '' : await response.text()}`
    )
    return (await response.json()).data
  }
  const workspace = await call('workspaces/create', {
    name: `Inline cards ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:table-2',
    description: 'Synthetic board acceptance',
    enabled_modules: ['databases']
  })
  const db = (route, data, query = {}) =>
    call('workspaceDatabases/' + route, data, {
      workspace_id: workspace.id,
      ...query
    })
  const base = await db('createBase', {
    name: 'Launch board',
    description: '',
    initial_view: 'kanban'
  })
  const fields = {}
  for (const [name, kind, options] of [
    ['Summary', 'text'],
    ['Effort', 'number'],
    ['Due', 'date'],
    ['Verified', 'checkbox'],
    ['Stage', 'select', ['Plan', 'Build']],
    ['Track', 'select', ['Native', 'Web']]
  ])
    fields[name] = await db('createField', {
      base_id: base.id,
      name,
      kind,
      ...(options ? { options } : {})
    })
  const people = await db('createBase', {
    name: 'People',
    description: '',
    initial_view: 'table'
  })
  const owner = await db('createRecord', {
    base_id: people.id,
    title: 'Alex',
    content: '',
    values: {}
  })
  fields.Owner = await db('createField', {
    base_id: base.id,
    name: 'Owner',
    kind: 'relation',
    target_base_id: people.id
  })
  for (const track of ['Native', 'Web'])
    await db('createRecord', {
      base_id: base.id,
      title: `${track} release`,
      content: '',
      values: { [fields.Track.id]: track }
    })
  let snapshot = await db('snapshot')
  const view = snapshot.views.find(item => item.base_id === base.id)
  await db(
    'updateView',
    { ...view, config: { ...view.config, sub_group_by: fields.Track.id } },
    { id: view.id }
  )
  const id = randomUUID()
  await call('workspaces/savePage', {
    id,
    workspace_id: workspace.id,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title: 'Inline board review',
      icon: 'lucide:table-2',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        {
          id: randomUUID(),
          type: 'database',
          title: '',
          content: '',
          width: 'full',
          url: '',
          widget: '',
          database: {
            workspaceId: workspace.id,
            baseId: base.id,
            viewId: view.id,
            height: 0
          }
        }
      ]
    }
  })
  const url = `http://localhost:5173/page/${id}?workspace=${workspace.id}`
  result = { ...result, workspace: workspace.id, base: base.id, page: id, url }
  await page.goto(url)
  const board = page
    .locator('.monolith-inline-database')
    .filter({
      has: page.getByRole('heading', { name: base.name, exact: true })
    })
  await expect(board.locator('.monolith-board-card')).toHaveCount(2, {
    timeout: 45000
  })
  const nativeSection = board
    .locator('.database-board-section')
    .filter({ has: page.getByRole('button', { name: /^Native/ }) })
  const column = nativeSection.locator(
    '.database-board-cell[aria-label="Unchecked"]'
  )
  const side = page.locator('.database-record-surface')
  stage = 'new card stays inline with group defaults'
  await column.getByRole('button', { name: 'New page', exact: true }).click()
  const input = column.getByRole('textbox', { name: 'Title', exact: true })
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await expect(side).toHaveCount(0)
  const card = column
    .locator('.monolith-board-card')
    .filter({ has: page.getByRole('textbox', { name: 'Title', exact: true }) })
  const recordId = await card.getAttribute('data-record-id')
  const savedCard = board.locator(`[data-record-id="${recordId}"]`)
  const readRecord = async () =>
    (await db('snapshot')).records.find(item => item.id === recordId)
  assert.equal((await readRecord()).done, false)
  assert.equal((await readRecord()).values[fields.Track.id], 'Native')
  await expect(card).toHaveAttribute('draggable', 'false')

  stage = 'title blur followed immediately by property save'
  // Simulated latency catches overlapping revisions when blur and click save together.
  await page.route('**/workspaceDatabases/updateRecord?*', async route => {
    await new Promise(resolve => setTimeout(resolve, 200))
    await route.continue()
  })
  await input.fill('Ship the inline board')
  await savedCard.getByRole('button', { name: 'Summary', exact: true }).click()
  let popup = page.getByRole('dialog', { name: 'Summary', exact: true })
  await popup
    .getByRole('textbox', { name: 'Summary', exact: true })
    .fill('Edit here without leaving the board')
  await popup
    .getByRole('textbox', { name: 'Summary', exact: true })
    .press('Enter')
  await expect
    .poll(async () => (await readRecord()).values[fields.Summary.id])
    .toBe('Edit here without leaving the board')
  assert.equal((await readRecord()).title, 'Ship the inline board')
  await page.unroute('**/workspaceDatabases/updateRecord?*')
  await expect(side).toHaveCount(0)
  await expect(
    savedCard.getByRole('button', {
      name: 'Edit name: Ship the inline board',
      exact: true
    })
  ).toBeVisible()

  stage = 'edit card properties'
  async function value(name, value) {
    await savedCard.getByRole('button', { name, exact: true }).click()
    const dialog = page.getByRole('dialog', { name, exact: true })
    await dialog.locator('input.database-value-input').fill(value)
    await dialog.locator('input.database-value-input').press('Enter')
    await expect(dialog).toHaveCount(0)
    await expect(
      savedCard.getByRole('button', { name, exact: true })
    ).toBeEnabled()
  }
  await value('Effort', '8')
  await value('Due', '2026-10-25')
  await savedCard
    .getByRole('checkbox', { name: 'Verified', exact: true })
    .click()
  await expect(
    savedCard.getByRole('checkbox', { name: 'Verified', exact: true })
  ).toBeChecked()
  await savedCard.getByRole('button', { name: 'Stage', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'Stage', exact: true })
  await popup.getByRole('button', { name: 'Build', exact: true }).click()
  await expect(
    savedCard.getByRole('button', { name: 'Stage', exact: true })
  ).toHaveText('Build')
  await savedCard.getByRole('button', { name: 'Owner', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'Owner', exact: true })
  await popup.getByRole('checkbox', { name: 'Alex', exact: true }).check()
  await popup.getByRole('button', { name: 'Save links', exact: true }).click()
  await expect
    .poll(async () =>
      (await db('snapshot')).links.some(
        link =>
          link.source_record_id === recordId &&
          link.target_record_id === owner.id
      )
    )
    .toBe(true)
  await page.keyboard.press('Escape')
  await savedCard.getByRole('button', { name: 'Owner', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Owner', exact: true })
  ).toBeVisible()
  await expect(side).toHaveCount(0)
  await page.keyboard.press('Escape')
  const saved = await readRecord()
  assert.equal(saved.values[fields.Effort.id], 8)
  assert.equal(saved.values[fields.Due.id], '2026-10-25')
  assert.equal(saved.values[fields.Verified.id], true)
  assert.equal(saved.values[fields.Stage.id], 'Build')
  await savedCard.scrollIntoViewIfNeeded()
  await savedCard.hover()
  await page.screenshot({
    path: `.temp/board-inline-${engine}-properties.png`,
    animations: 'disabled'
  })

  stage = 'rename cancel and explicit Open'
  await savedCard
    .getByRole('button', {
      name: 'Edit name: Ship the inline board',
      exact: true
    })
    .click()
  await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Discard this name')
  await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .press('Escape')
  assert.equal((await readRecord()).title, 'Ship the inline board')
  await expect(side).toHaveCount(0)
  await savedCard
    .getByRole('button', {
      name: 'Edit name: Ship the inline board',
      exact: true
    })
    .click()
  await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Ready to launch')
  await savedCard
    .getByRole('button', { name: 'Open Ship the inline board', exact: true })
    .click()
  await expect(side).toBeVisible()
  assert.equal((await readRecord()).title, 'Ready to launch')
  await side.locator('[data-close-record]').click()
  await expect(side).toHaveCount(0)

  stage = 'toolbar and group header also create inline'
  await board
    .getByRole('button', { name: 'Add a page to Checked', exact: true })
    .click()
  let title = board.getByRole('textbox', { name: 'Title', exact: true })
  await expect(title).toBeFocused()
  await title.fill('Created from group header')
  await title.press('Enter')
  await expect(
    board.getByRole('button', {
      name: 'Edit name: Created from group header',
      exact: true
    })
  ).toBeVisible()
  await expect(side).toHaveCount(0)
  await board.locator('.database-new-button').click()
  title = board.getByRole('textbox', { name: 'Title', exact: true })
  await expect(title).toBeFocused()
  await title.fill('Created from toolbar')
  await title.press('Enter')
  await expect(
    board.getByRole('button', {
      name: 'Edit name: Created from toolbar',
      exact: true
    })
  ).toBeVisible()
  await expect(side).toHaveCount(0)

  stage = 'reload and narrow layout'
  await page.reload()
  await expect(board.locator('.monolith-board-card')).toHaveCount(5, {
    timeout: 30000
  })
  await expect(
    savedCard.getByRole('button', {
      name: 'Edit name: Ready to launch',
      exact: true
    })
  ).toBeVisible()
  await expect(
    savedCard.getByRole('button', { name: 'Summary', exact: true })
  ).toHaveText('Edit here without leaving the board')
  await expect(
    savedCard.getByRole('button', { name: 'Owner', exact: true })
  ).toHaveText('Alex')
  await expect(side).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 900 })
  await savedCard.scrollIntoViewIfNeeded()
  await savedCard
    .getByRole('button', { name: 'Edit name: Ready to launch', exact: true })
    .click()
  await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill(
      'A long card name that wraps naturally inside the narrow board column without cropping'
    )
  const geometry = await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .evaluate(input => ({
      height: input.clientHeight,
      scroll: input.scrollHeight,
      width: input.clientWidth,
      scrollWidth: input.scrollWidth
    }))
  assert.ok(geometry.scroll <= geometry.height + 1)
  assert.ok(geometry.scrollWidth <= geometry.width + 1)
  assert.ok(geometry.width > 165, 'Compact cards leave room for the name')
  await page.screenshot({
    path: `.temp/board-inline-${engine}-narrow.png`,
    animations: 'disabled'
  })
  await savedCard
    .getByRole('textbox', { name: 'Title', exact: true })
    .press('Escape')

  stage = 'create in a filtered board'
  await page.setViewportSize({ width: 1480, height: 1080 })
  const currentView = (await db('snapshot')).views.find(item => item.id === view.id)
  await db('updateView', {
    ...currentView,
    config: { ...currentView.config, filters: [{ field_id: fields.Stage.id, operator: 'equals', value: 'Build' }] }
  }, { id: view.id })
  await page.reload()
  await expect(board.locator('.monolith-board-card')).toHaveCount(1)
  await board.locator('.database-new-button').click()
  title = board.getByRole('textbox', { name: 'Title', exact: true })
  await expect(title).toBeFocused()
  await title.fill('Created under an active filter')
  await title.press('Enter')
  const filteredCard = board.locator('.monolith-board-card').filter({
    has: page.getByRole('button', { name: 'Edit name: Created under an active filter', exact: true })
  })
  await expect(filteredCard).toBeVisible()
  await expect(side).toHaveCount(0)
  await filteredCard.getByRole('button', { name: 'Stage', exact: true }).click()
  await page.getByRole('dialog', { name: 'Stage', exact: true }).getByRole('button', { name: 'Build', exact: true }).click()
  await expect(filteredCard.getByRole('button', { name: 'Stage', exact: true })).toHaveText('Build')
  await page.reload()
  await expect(board.locator('.monolith-board-card')).toHaveCount(2)
  await expect(filteredCard).toBeVisible()

  stage = 'drag saved cards without opening a page'
  await savedCard.scrollIntoViewIfNeeded()
  await savedCard.dragTo(nativeSection.locator('.database-board-cell[aria-label="Checked"]'), {
    sourcePosition: { x: 7, y: 7 }, targetPosition: { x: 60, y: 50 }
  })
  await expect.poll(async () => (await readRecord()).done).toBe(true)
  await expect(side).toHaveCount(0)
  await expect(savedCard.getByRole('button', { name: 'Summary', exact: true })).toHaveText('Edit here without leaving the board')
  await expect(page.locator('body')).not.toContainText('[MISSING LOCALE]')
  assert.deepEqual(errors, [])
  result.passed = true
  console.log(
    `${engine}: inline creation, title/property saves, relations, explicit Open and reload passed`
  )
} catch (error) {
  result.failure = String(error)
  result.stage = stage
  await page
    .screenshot({
      path: `.temp/board-inline-${engine}-failure.png`,
      animations: 'disabled'
    })
    .catch(() => {})
  writeFileSync(
    `.temp/board-inline-${engine}-failure.txt`,
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  )
  throw error
} finally {
  writeFileSync(
    `.temp/board-inline-${engine}-result.json`,
    JSON.stringify({ ...result, errors }, null, 2)
  )
  await browser.close()
}
