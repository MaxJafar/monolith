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
await page.addInitScript(() => {
  window.boardAnimations = []
  const animate = Element.prototype.animate
  Element.prototype.animate = function (frames, options) {
    if (this.dataset?.boardRecord)
      window.boardAnimations.push({ id: this.dataset.boardRecord, frames })
    return animate.call(this, frames, options)
  }
})
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
    name: `Board layout ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:columns-3',
    description: 'Synthetic column layout and rename acceptance',
    enabled_modules: ['databases']
  })
  const db = (route, data, query = {}) =>
    call('workspaceDatabases/' + route, data, {
      workspace_id: workspace.id,
      ...query
    })
  const base = await db('createBase', {
    name: 'Release board',
    description: '',
    initial_view: 'kanban'
  })
  const status = await db('createField', {
    base_id: base.id,
    name: 'Stage',
    kind: 'select',
    options: ['Plan', 'Build']
  })
  const track = await db('createField', {
    base_id: base.id,
    name: 'Track',
    kind: 'select',
    options: ['Native', 'Web']
  })
  const cards = {}
  for (const [name, group, lane] of [
    ['Alpha', 'Plan', 'Native'],
    ['Bravo', 'Plan', 'Native'],
    ['Charlie', 'Plan', 'Native'],
    ['Delta', 'Build', 'Native'],
    ['Echo', 'Build', 'Web']
  ])
    cards[name] = await db('createRecord', {
      base_id: base.id,
      title: name,
      content: '',
      values: { [status.id]: group, [track.id]: lane }
    })
  const snapshot = () => db('snapshot')
  const view = (await snapshot()).views.find(item => item.base_id === base.id)
  async function configure(config) {
    const current = (await snapshot()).views.find(item => item.id === view.id)
    return db(
      'updateView',
      {
        ...current,
        group_field_id: status.id,
        config: { ...current.config, group_property: null, ...config }
      },
      { id: view.id }
    )
  }
  await configure({
    sub_group_by: track.id,
    sorts: [{ field_id: 'title', direction: 'asc' }]
  })
  const id = randomUUID()
  await call('workspaces/savePage', {
    id,
    workspace_id: workspace.id,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title: 'Board layout review',
      icon: 'lucide:columns-3',
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
  result = {
    ...result,
    url,
    workspace: workspace.id,
    base: base.id,
    view: view.id
  }
  await page.goto(url)
  const board = page.locator('.database-grouped-board')
  const grip = name =>
    board.getByRole('button', { name: `Drag ${name} column`, exact: true })
  const heading = name =>
    board.locator('[data-board-column-key]').filter({
      has: page.getByRole('button', {
        name: `Drag ${name} column`,
        exact: true,
        includeHidden: true
      })
    })
  const layout = async () =>
    (await snapshot()).views.find(item => item.id === view.id).config
      .board_layout
  const groupKey = value => JSON.stringify([status.id, value])
  const columnOrder = () =>
    board
      .locator('[data-board-column-key]')
      .evaluateAll(elements =>
        elements.map(element => JSON.parse(element.dataset.boardColumnKey)[1])
      )
  const sourceName = async () =>
    (await snapshot()).bases.find(item => item.id === base.id).name
  await expect(grip('Build')).toBeEnabled({ timeout: 45000 })

  stage = 'rename inline source with Enter, Escape and blur'
  await page
    .getByRole('button', { name: 'Rename Release board', exact: true })
    .click()
  const nameInput = page.getByRole('textbox', {
    name: 'Database name',
    exact: true
  })
  await expect(nameInput).toBeFocused()
  await nameInput.fill('  Launch systems  ')
  await nameInput.press('Enter')
  await expect.poll(sourceName).toBe('Launch systems')
  await expect(
    page.getByRole('button', { name: 'Rename Launch systems', exact: true })
  ).toBeEnabled()
  assert.equal(page.url(), url, 'renaming an embed keeps its page open')
  await page
    .getByRole('button', { name: 'Rename Launch systems', exact: true })
    .click()
  await nameInput.fill('Cancelled rename')
  await nameInput.press('Escape')
  await expect(nameInput).toHaveCount(0)
  assert.equal(await sourceName(), 'Launch systems')
  await page
    .getByRole('button', { name: 'Rename Launch systems', exact: true })
    .click()
  await nameInput.fill('Launch board')
  await nameInput.press('Tab')
  await expect.poll(sourceName).toBe('Launch board')

  stage = 'column drag indicator and saved order'
  await expect(grip('Build')).toBeEnabled()
  const start = await grip('Build').boundingBox()
  const first = await heading('Ungrouped').boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + 35, start.y - 10, { steps: 8 })
  await page.mouse.move(first.x + 8, first.y + 20, { steps: 20 })
  await page.mouse.move(first.x + 9, first.y + 20)
  await expect(board.locator('.database-board-column-indicator')).toBeVisible()
  await expect(page.locator('.monolith-native-drag-preview')).toBeVisible()
  await page.screenshot({ path: `.temp/board-layout-${engine}-indicator.png` })
  await page.mouse.up()
  await expect.poll(columnOrder).toEqual(['Build', null, 'Plan'])
  await expect
    .poll(async () => (await layout()).order[status.id])
    .toEqual(['Build', null, 'Plan'].map(groupKey))
  await expect(grip('Build')).toBeEnabled()
  await expect(page.locator('.monolith-native-drag-preview')).toHaveCount(0)

  stage = 'resize live, persist width, align every subgroup'
  // WebKit's native drag consumes the release; reset the automation mouse
  // before starting a separate pointer gesture.
  if (engine === 'webkit') await page.mouse.up()
  await heading('Build').evaluate(element =>
    Promise.all(
      element
        .getAnimations()
        .map(animation => animation.finished.catch(() => {}))
    )
  )
  const resize = board.getByRole('separator', {
    name: 'Resize Build column',
    exact: true
  })
  const edge = await resize.boundingBox()
  await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    edge.x + edge.width / 2 + 120,
    edge.y + edge.height / 2,
    { steps: 12 }
  )
  await expect(resize).toHaveAttribute('aria-valuenow', '400')
  await page.mouse.up()
  await expect
    .poll(async () => (await layout()).columns[groupKey('Build')]?.width)
    .toBe(400)
  await expect(grip('Build')).toBeEnabled()
  for (const cell of await board
    .locator('.database-board-cell[aria-label="Build"]')
    .all()) {
    assert.ok(Math.abs((await cell.boundingBox()).width - 400) < 2)
    assert.ok(
      Math.abs(
        (await cell.boundingBox()).x - (await heading('Build').boundingBox()).x
      ) < 2
    )
  }
  await page.reload()
  await expect(resize).toHaveAttribute('aria-valuenow', '400', {
    timeout: 45000
  })
  await expect.poll(columnOrder).toEqual(['Build', null, 'Plan'])

  stage = 'collapse and expand groups, retain width and positions'
  await board
    .getByRole('button', { name: 'Collapse Build group', exact: true })
    .click()
  const expand = board.getByRole('button', {
    name: 'Expand Build group',
    exact: true
  })
  await expect(expand).toBeEnabled()
  await expect(expand).toBeFocused()
  await expect
    .poll(async () => (await layout()).columns[groupKey('Build')]?.collapsed)
    .toBe(true)
  await expect
    .poll(async () => (await heading('Build').boundingBox()).width)
    .toBe(0)
  await page.reload()
  await expect(expand).toBeEnabled({ timeout: 45000 })
  await expand.click()
  await expect(resize).toHaveAttribute('aria-valuenow', '400')
  await expect
    .poll(async () => (await heading('Build').boundingBox()).width)
    .toBe(412)
  await expect(grip('Build')).toBeEnabled()
  const native = board
    .locator('.database-board-section')
    .filter({ has: page.getByRole('button', { name: /^Native/ }) })
  await native.getByRole('button', { name: /^Native/ }).click()
  await expect(
    native.locator('.database-board-section-reveal')
  ).toHaveAttribute('inert', '')
  await expect
    .poll(async () => (await layout()).collapsed_sections)
    .toContain(JSON.stringify([track.id, 'Native']))
  await page.reload()
  await expect(native.getByRole('button', { name: /^Native/ })).toHaveAttribute(
    'aria-expanded',
    'false',
    { timeout: 45000 }
  )
  await native.getByRole('button', { name: /^Native/ }).click()
  await expect(grip('Build')).toBeEnabled()

  stage = 'all columns can be collapsed and restored after reload'
  for (const group of ['Build', 'Ungrouped', 'Plan']) {
    await board
      .getByRole('button', { name: `Collapse ${group} group`, exact: true })
      .click()
    await expect(
      board.getByRole('button', { name: `Expand ${group} group`, exact: true })
    ).toBeEnabled()
  }
  await page.reload()
  for (const group of ['Build', 'Ungrouped', 'Plan']) {
    await board
      .getByRole('button', { name: `Expand ${group} group`, exact: true })
      .click({ timeout: 45000 })
    await expect(grip(group)).toBeEnabled()
  }
  await expect(resize).toHaveAttribute('aria-valuenow', '400')

  stage = 'keyboard move and resize with focus retained'
  await grip('Build').focus()
  await grip('Build').press('Alt+ArrowRight')
  await expect.poll(columnOrder).toEqual([null, 'Build', 'Plan'])
  await expect(grip('Build')).toBeEnabled()
  await expect(grip('Build')).toBeFocused()
  await resize.focus()
  await resize.press('ArrowLeft')
  await expect
    .poll(async () => (await layout()).columns[groupKey('Build')]?.width)
    .toBe(380)
  await expect(resize).toBeEnabled()
  await expect(resize).toBeFocused()

  stage = 'Escape cancels width changes'
  const current = await resize.boundingBox()
  await page.mouse.move(current.x + 6, current.y + 12)
  await page.mouse.down()
  await page.mouse.move(current.x + 86, current.y + 12, { steps: 8 })
  await expect(resize).toHaveAttribute('aria-valuenow', '460')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(resize).toHaveAttribute('aria-valuenow', '380')
  assert.equal((await layout()).columns[groupKey('Build')].width, 380)

  stage = 'failed layout save rolls back'
  await page.route('**/workspaceDatabases/updateView?*', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Synthetic failure' })
    })
  )
  await board
    .getByRole('button', { name: 'Collapse Build group', exact: true })
    .click()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: "Couldn't save the board layout" })
  ).toBeVisible()
  await expect(grip('Build')).toBeEnabled()
  assert.equal((await layout()).columns[groupKey('Build')].collapsed, false)
  await page.unroute('**/workspaceDatabases/updateView?*')

  stage = 'rename in database dashboard and sync back to inline page'
  await page.goto(`http://localhost:5173/databases?workspace=${workspace.id}`)
  await page
    .getByRole('button', { name: 'Rename Launch board', exact: true })
    .click({ timeout: 45000 })
  await nameInput.fill('Dashboard renamed')
  await nameInput.press('Enter')
  await expect.poll(sourceName).toBe('Dashboard renamed')
  await expect(
    page.getByRole('button', { name: 'Rename Dashboard renamed', exact: true })
  ).toBeEnabled()
  await page
    .getByRole('link', { name: 'Dashboard renamed', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Dashboard renamed', exact: true })
  ).toBeVisible()
  await page.goto(url)
  await expect(
    page.getByRole('button', { name: 'Rename Dashboard renamed', exact: true })
  ).toBeEnabled({ timeout: 45000 })
  await expect.poll(columnOrder).toEqual([null, 'Build', 'Plan'])

  stage = 'rename failure keeps draft available and reduced motion'
  await page.route('**/workspaceDatabases/updateBase?*', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Synthetic failure' })
    })
  )
  await page
    .getByRole('button', { name: 'Rename Dashboard renamed', exact: true })
    .click()
  await nameInput.fill('Retry name')
  await nameInput.press('Enter')
  await expect(
    page.getByRole('alert').filter({ hasText: "Couldn't rename the database" })
  ).toBeVisible()
  await expect(nameInput).toHaveValue('Retry name')
  assert.equal(await sourceName(), 'Dashboard renamed')
  await page.unroute('**/workspaceDatabases/updateBase?*')
  await nameInput.press('Enter')
  await expect.poll(sourceName).toBe('Retry name')
  await expect(
    page.getByRole('alert').filter({ hasText: "Couldn't rename the database" })
  ).toHaveCount(0)
  await expect(grip('Build')).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await board
    .getByRole('button', { name: 'Collapse Build group', exact: true })
    .click()
  await expect(expand).toBeEnabled()
  assert.equal(
    await board
      .locator('.database-board-columns')
      .first()
      .evaluate(element => getComputedStyle(element).transitionDuration),
    '0s'
  )
  await expand.click()
  await expect(grip('Build')).toBeEnabled()
  await page.screenshot({
    path: `.temp/board-layout-${engine}-final.png`,
    animations: 'disabled'
  })
  assert.deepEqual(errors, [])
  await expect(page.locator('body')).not.toContainText('[MISSING LOCALE]')
  result.passed = true
  console.log(
    `${engine}: column ordering, width, collapse, persistence, keyboard, rollback and database rename passed`
  )
} catch (error) {
  result.failure = String(error)
  result.stage = stage
  await page
    .screenshot({
      path: `.temp/board-layout-${engine}-failure.png`,
      animations: 'disabled'
    })
    .catch(() => {})
  throw error
} finally {
  writeFileSync(
    `.temp/board-layout-${engine}-result.json`,
    JSON.stringify({ ...result, errors }, null, 2)
  )
  await browser.close()
}
