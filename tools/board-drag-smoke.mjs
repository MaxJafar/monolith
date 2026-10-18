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
    name: `Board drag ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:columns-3',
    description: 'Synthetic board drag acceptance',
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
      title: 'Board drag review',
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
  const side = page.locator('.database-record-surface')
  const column = (group, lane = 'Native') =>
    board
      .locator('.database-board-section')
      .filter({
        has: page.getByRole('button', { name: new RegExp(`^${lane}`) })
      })
      .locator(`.database-board-cell[aria-label="${group}"]`)
  const card = name =>
    board.locator(`.monolith-board-card[data-record-id="${cards[name].id}"]`)
  const handle = name =>
    card(name).getByRole('button', { name: `Drag ${name}`, exact: true })
  const names = col =>
    col.locator('.database-board-title-button').allTextContents()
  const orderKey = (group, lane = 'Native') =>
    JSON.stringify([status.id, group, track.id, lane])
  const savedOrder = async (group, lane = 'Native') =>
    (await snapshot()).views.find(item => item.id === view.id).config
      .board_order?.[orderKey(group, lane)]
  async function settled(name = 'Alpha') {
    await expect(handle(name)).toBeEnabled()
    await expect(side).toHaveCount(0)
    await expect(board.locator('.database-board-drop-indicator')).toHaveCount(0)
    await expect(page.locator('.monolith-native-drag-preview')).toHaveCount(0)
  }
  async function drag(name, destination, atEnd = false) {
    await handle(name).scrollIntoViewIfNeeded()
    const box = await destination.boundingBox()
    await handle(name).dragTo(destination, {
      targetPosition: {
        x: Math.min(box.width / 2, 100),
        y: atEnd ? box.height - 5 : 5
      }
    })
    await settled(name)
  }
  await expect(board.locator('.monolith-board-card')).toHaveCount(5, {
    timeout: 45000
  })
  await expect
    .poll(() => names(column('Plan')))
    .toEqual(['Alpha', 'Bravo', 'Charlie'])

  stage = 'same-column insertion, real drag preview and indicator'
  const source = await handle('Charlie').boundingBox()
  const target = await card('Alpha').boundingBox()
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(source.x + 35, source.y - 12, { steps: 8 })
  await page.mouse.move(target.x + 70, target.y + 7, { steps: 15 })
  await page.mouse.move(target.x + 72, target.y + 7)
  await expect(board.locator('.database-board-drop-indicator')).toBeVisible()
  await expect(page.locator('.monolith-native-drag-preview')).toBeVisible()
  await expect
    .poll(async () => {
      const line = await board
        .locator('.database-board-drop-indicator')
        .boundingBox()
      const first = await card('Alpha').boundingBox()
      return Math.abs(line.y - first.y)
    })
    .toBeLessThan(10)
  const previewWidth = await page
    .locator('.monolith-native-drag-preview')
    .evaluate(el => el.getBoundingClientRect().width)
  assert.ok(previewWidth > 240, 'drag preview preserves the card width')
  await page.screenshot({ path: `.temp/board-drag-${engine}-indicator.png` })
  await page.mouse.up()
  await expect
    .poll(() => names(column('Plan')))
    .toEqual(['Charlie', 'Alpha', 'Bravo'])
  await settled()
  const landing = await page.evaluate(
    id => window.boardAnimations.find(animation => animation.id === id),
    cards.Charlie.id
  )
  assert.ok(landing, 'card has a settle animation')
  assert.ok(
    Math.abs(parseFloat(landing.frames[0].translate.split(' ')[1])) < 100,
    'card settles from its release point without jumping back to its old position'
  )
  await expect
    .poll(() => savedOrder('Plan'))
    .toEqual(['Charlie', 'Alpha', 'Bravo'].map(name => cards[name].id))
  assert.deepEqual(
    (await snapshot()).views.find(item => item.id === view.id).config.sorts,
    []
  )
  await page.reload()
  await expect
    .poll(() => names(column('Plan')))
    .toEqual(['Charlie', 'Alpha', 'Bravo'])

  stage = 'move downward and between groups at an exact position'
  await drag('Alpha', card('Bravo'), true)
  await expect
    .poll(() => names(column('Plan')))
    .toEqual(['Charlie', 'Bravo', 'Alpha'])
  await drag('Alpha', card('Delta'))
  await expect.poll(() => names(column('Build'))).toEqual(['Alpha', 'Delta'])
  await expect
    .poll(
      async () =>
        (await snapshot()).records.find(item => item.id === cards.Alpha.id)
          .values[status.id]
    )
    .toBe('Build')

  stage = 'drop in an empty group and across subgroup rows'
  await drag('Bravo', column('Ungrouped'))
  await expect.poll(() => names(column('Ungrouped'))).toEqual(['Bravo'])
  await drag('Charlie', card('Echo'), true)
  await expect
    .poll(() => names(column('Build', 'Web')))
    .toEqual(['Echo', 'Charlie'])
  const moved = (await snapshot()).records.find(
    item => item.id === cards.Charlie.id
  )
  assert.equal(moved.values[track.id], 'Web')
  assert.equal(moved.values[status.id], 'Build')

  stage = 'keyboard order and cancellation'
  await handle('Alpha').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect.poll(() => names(column('Build'))).toEqual(['Delta', 'Alpha'])
  await settled()
  await expect(handle('Alpha')).toBeFocused()
  const beforeCancel = await savedOrder('Build')
  const cancelSource = await handle('Alpha').boundingBox()
  const cancelTarget = await card('Delta').boundingBox()
  await page.mouse.move(cancelSource.x + 8, cancelSource.y + 8)
  await page.mouse.down()
  await page.mouse.move(cancelTarget.x + 80, cancelTarget.y + 5, { steps: 15 })
  await page.mouse.move(cancelTarget.x + 82, cancelTarget.y + 5)
  await expect(board.locator('.database-board-drop-indicator')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await settled()
  assert.deepEqual(await savedOrder('Build'), beforeCancel)
  await expect.poll(() => names(column('Build'))).toEqual(['Delta', 'Alpha'])

  stage = 'persistence, reduced motion and save failure rollback'
  await page.reload()
  await expect
    .poll(() => names(column('Build', 'Web')))
    .toEqual(['Echo', 'Charlie'])
  await expect.poll(() => names(column('Build'))).toEqual(['Delta', 'Alpha'])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await drag('Alpha', card('Delta'))
  await expect.poll(() => names(column('Build'))).toEqual(['Alpha', 'Delta'])
  await page.route('**/workspaceDatabases/updateView?*', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Synthetic save failure' })
    })
  )
  await drag('Alpha', card('Delta'), true)
  await expect.poll(() => names(column('Build'))).toEqual(['Alpha', 'Delta'])
  await page.unroute('**/workspaceDatabases/updateView?*')
  await settled()
  await expect(
    page.getByText("Couldn't move the card. Please try again.", { exact: true })
  ).toBeVisible()

  stage = 'filtered-out cards retain their place in saved order'
  cards.Foxtrot = await db('createRecord', {
    base_id: base.id,
    title: 'Foxtrot',
    content: '',
    values: { [status.id]: 'Build', [track.id]: 'Native' }
  })
  await configure({
    filters: [{ field_id: 'title', operator: 'not-equals', value: 'Delta' }]
  })
  await page.reload()
  await expect.poll(() => names(column('Build'))).toEqual(['Alpha', 'Foxtrot'])
  await drag('Foxtrot', card('Alpha'))
  await expect.poll(() => names(column('Build'))).toEqual(['Foxtrot', 'Alpha'])
  await configure({ filters: [] })
  await page.reload()
  await expect
    .poll(() => names(column('Build')))
    .toEqual(['Foxtrot', 'Alpha', 'Delta'])

  stage = 'scroll wide boards while dragging and cancel outside'
  await page.setViewportSize({ width: 720, height: 900 })
  await handle('Delta').scrollIntoViewIfNeeded()
  await board.evaluate(el => {
    el.scrollLeft = el.scrollWidth - el.clientWidth
  })
  const startScroll = await board.evaluate(el => el.scrollLeft)
  assert.ok(
    startScroll > 30,
    `narrow board has horizontal overflow: ${JSON.stringify(await board.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, parent: el.parentElement.clientWidth })))}`
  )
  const scrollSource = await handle('Delta').boundingBox()
  const scrollBoard = await board.boundingBox()
  await page.mouse.move(scrollSource.x + 8, scrollSource.y + 8)
  await page.mouse.down()
  await page.mouse.move(scrollSource.x - 24, scrollSource.y + 4, { steps: 8 })
  await page.mouse.move(scrollBoard.x + 8, Math.max(scrollBoard.y + 100, 150), {
    steps: 15
  })
  await expect
    .poll(() => board.evaluate(el => el.scrollLeft))
    .toBeLessThan(startScroll - 30)
  await page.mouse.move(30, 110, { steps: 10 })
  await page.mouse.up()
  await settled('Delta')
  await expect
    .poll(() => names(column('Build')))
    .toEqual(['Foxtrot', 'Alpha', 'Delta'])
  await page.setViewportSize({ width: 1480, height: 1080 })
  await page.screenshot({
    path: `.temp/board-drag-${engine}-final.png`,
    animations: 'disabled'
  })
  assert.deepEqual(errors, [])
  await expect(page.locator('body')).not.toContainText('[MISSING LOCALE]')
  result.passed = true
  console.log(
    `${engine}: board reorder, group/subgroup moves, preview, cancellation, keyboard, persistence and rollback passed`
  )
} catch (error) {
  result.failure = String(error)
  result.stage = stage
  await page
    .screenshot({
      path: `.temp/board-drag-${engine}-failure.png`,
      animations: 'disabled'
    })
    .catch(() => {})
  throw error
} finally {
  writeFileSync(
    `.temp/board-drag-${engine}-result.json`,
    JSON.stringify({ ...result, errors }, null, 2)
  )
  await browser.close()
}
