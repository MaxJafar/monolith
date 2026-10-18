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
    name: `Table acceptance ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:table-2',
    description: 'Synthetic table checks',
    enabled_modules: ['databases']
  })
  const scope = { workspace_id: workspace.id }
  const db = (route, data, query = {}) =>
    call('workspaceDatabases/' + route, data, { ...scope, ...query })
  const base = await db('createBase', {
    name: 'Release board',
    description: '',
    initial_view: 'kanban'
  })
  const fields = []
  for (const [name, kind] of [
    ['Summary', 'text'],
    ['Effort', 'number'],
    ['Due', 'date'],
    ['Verified', 'checkbox'],
    ['Notes', 'text']
  ])
    fields.push(await db('createField', { base_id: base.id, name, kind }))
  const records = []
  for (let i = 0; i < 8; i++)
    records.push(
      await db('createRecord', {
        base_id: base.id,
        title: `Release item ${i + 1}`,
        content: 'Record opening paragraph',
        done: i % 2 === 0,
        values: {
          [fields[0].id]: 'Complete card, no clipping',
          [fields[1].id]: i,
          [fields[2].id]: '2026-10-15',
          [fields[3].id]: i % 2 === 0,
          [fields[4].id]: 'Fifth visible property'
        }
      })
    )
  const snapshot = await db('snapshot')
  const view = snapshot.views.find(item => item.base_id === base.id)
  const id = randomUUID()
  const block = type => ({
    id: randomUUID(),
    type,
    title: '',
    content: '',
    width: 'full',
    url: '',
    widget: ''
  })
  await call('workspaces/savePage', {
    id,
    workspace_id: workspace.id,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title: 'Table flow review',
      icon: 'lucide:table-2',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        {
          ...block('database'),
          database: {
            workspaceId: workspace.id,
            baseId: base.id,
            viewId: view.id,
            height: 260
          }
        },
        block('document')
      ]
    }
  })
  const url = `http://localhost:5173/page/${id}?workspace=${workspace.id}`
  result = { ...result, workspace: workspace.id, base: base.id, page: id, url }
  await page.goto(url)
  const board = page.locator('.monolith-inline-database').filter({
    has: page.getByRole('heading', { name: base.name, exact: true })
  })
  await expect(board.locator('.monolith-board-card')).toHaveCount(8, {
    timeout: 45000
  })
  await board.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true })
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})))
  })
  stage = 'natural height and width'
  const geometry = await board.evaluate(element => {
    const viewport = element.querySelector('.monolith-inline-viewport')
    const columns = element.querySelector('.database-board-columns')
    const grouped = element.querySelector('.database-grouped-board')
    return {
      height: viewport.clientHeight,
      scroll: viewport.scrollHeight,
      width: grouped.clientWidth,
      columnsWidth: columns.getBoundingClientRect().width,
      bottom: viewport.getBoundingClientRect().bottom,
      buttons: [...element.querySelectorAll('.monolith-board-create')].map(
        button => button.getBoundingClientRect().bottom
      )
    }
  })
  assert.ok(geometry.height > 260, 'Saved height must not crop content')
  assert.ok(
    geometry.scroll <= geometry.height + 1,
    'No nested vertical scrolling'
  )
  assert.ok(
    geometry.buttons.every(bottom => bottom <= geometry.bottom),
    'Every column ends with an accessible create button'
  )
  assert.ok(
    Math.abs(geometry.columnsWidth - geometry.width) < 2,
    'Board columns fill available width'
  )
  await expect(
    board
      .locator('.monolith-board-card')
      .first()
      .locator('.database-card-property')
  ).toHaveCount(5)

  stage = 'one handle and slash insertion'
  const document = page
    .locator('.canvas-block')
    .filter({ has: page.locator('.zillion-prose') })
    .last()
  await expect(document.locator('.canvas-block-tools')).toHaveCount(0)
  await expect(document.locator('.monolith-block-grips button')).toHaveCount(1)
  await document.locator('.zillion-prose').click()
  await page.keyboard.type('Before the inline table')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/table', { delay: 20 })
  await page.getByRole('option', { name: 'Table', exact: true }).click()
  let picker = page.getByRole('region', {
    name: 'Inline database',
    exact: true
  })
  await expect(picker.locator('.monolith-inline-layouts summary')).toHaveText('Choose a layout · Table')
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill('Inline releases')
  await picker
    .getByRole('button', { name: 'New empty data source', exact: true })
    .click()
  const table = page.getByRole('table', {
    name: 'Inline releases',
    exact: true
  })
  await expect(table).toBeVisible({ timeout: 30000 })
  await expect(
    table
      .locator('tbody tr')
      .last()
      .getByRole('button', { name: 'New page', exact: true })
  ).toBeVisible()
  await table.getByRole('button', { name: 'New page', exact: true }).click()
  await table
    .getByRole('textbox', { name: 'New page', exact: true })
    .fill('Inline record')
  await table
    .getByRole('textbox', { name: 'New page', exact: true })
    .press('Enter')
  await expect(
    table.getByRole('link', { name: 'Inline record', exact: true })
  ).toBeVisible()
  await expect(document.locator('.zillion-prose')).toContainText(
    'Before the inline table'
  )
  await expect(document.locator('.canvas-block-tools')).toHaveCount(0)
  await expect(document.locator('.monolith-block-grips button')).toHaveCount(3)
  await expect
    .poll(async () =>
      JSON.stringify(
        (await call('workspaces/getPage', undefined, { id })).page.body
      )
    )
    .toContain('linkedDatabase')
  await page.reload()
  await expect(
    table.getByRole('link', { name: 'Inline record', exact: true })
  ).toBeVisible({ timeout: 30000 })
  console.log('One handle, slash insertion, footer creation and reload passed')

  stage = 'property settings'
  async function properties() {
    await board
      .getByRole('button', { name: 'View settings', exact: true })
      .click()
    const popup = page.getByRole('dialog', {
      name: 'View settings',
      exact: true
    })
    await popup.getByRole('button', { name: /^Property visibility/ }).click()
    return popup
  }
  let popup = await properties()
  await popup
    .getByRole('switch', { name: 'Show properties on cards', exact: true })
    .uncheck()
  await popup
    .getByRole('switch', { name: 'Show properties on pages', exact: true })
    .uncheck()
  await expect
    .poll(
      async () =>
        (await db('snapshot')).views.find(item => item.id === view.id).config
          .show_page_properties
    )
    .toBe(false)
  await page.keyboard.press('Escape')
  await expect(board.locator('.database-card-properties')).toHaveCount(0)
  await page.reload()
  await expect(board.locator('.monolith-board-card')).toHaveCount(8)
  await expect(board.locator('.database-card-properties')).toHaveCount(0)
  await board.getByRole('button', { name: `Open ${records[0].title}`, exact: true }).click()
  let surface = page.locator('.database-record-surface').last()
  await expect(surface).toBeVisible()
  await expect(surface.locator('.database-page-properties')).toHaveCount(0)
  await surface.locator('[data-close-record]').click()
  await expect(surface).toHaveCount(0)
  popup = await properties()
  await popup
    .getByRole('switch', { name: 'Show properties on cards', exact: true })
    .check()
  await popup
    .getByRole('switch', { name: 'Show properties on pages', exact: true })
    .check()
  await expect
    .poll(
      async () =>
        (await db('snapshot')).views.find(item => item.id === view.id).config
          .show_page_properties
    )
    .toBe(true)
  await popup.getByRole('button', { name: 'Hide Notes', exact: true }).click()
  await expect
    .poll(
      async () =>
        (await db('snapshot')).views.find(item => item.id === view.id).config
          .hidden_fields
    )
    .toContain(fields[4].id)
  await page.keyboard.press('Escape')
  await expect(
    board
      .locator('.monolith-board-card')
      .first()
      .locator('.database-card-property')
  ).toHaveCount(4)
  await board.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `.temp/table-flow-${engine}-board.png`,
    animations: 'disabled'
  })
  await board.getByRole('button', { name: `Open ${records[0].title}`, exact: true }).click()
  surface = page.locator('.database-record-surface').last()
  await expect(surface.locator('.database-page-properties')).toBeVisible()
  await expect(surface.locator('.database-page-properties')).toContainText(
    'Notes'
  )

  stage = 'side page slash command'
  await surface
    .getByRole('button', { name: 'Right side peek', exact: true })
    .click()
  await surface
    .locator('.zillion-prose')
    .first()
    .locator(':scope > p')
    .last()
    .click()
  await page.keyboard.press('End', { delay: 80 })
  await page.keyboard.press('Enter')
  await page.keyboard.type('/board', { delay: 20 })
  await page.getByRole('option', { name: 'Board', exact: true }).click()
  picker = page.getByRole('region', { name: 'Inline database', exact: true })
  await expect(picker.locator('.monolith-inline-layouts summary')).toHaveText('Choose a layout · Board')
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill('Inside a side page')
  await picker
    .getByRole('button', { name: 'New empty data source', exact: true })
    .click()
  await expect(surface.locator('.database-grouped-board')).toBeVisible({
    timeout: 30000
  })
  await expect(surface.locator('.monolith-board-create')).toHaveCount(2)
  await expect
    .poll(
      async () =>
        (await db('snapshot')).records.find(item => item.id === records[0].id)
          .content
    )
    .toContain('linkedDatabase')
  await page.screenshot({
    path: `.temp/table-flow-${engine}-side.png`,
    animations: 'disabled'
  })
  await surface.locator('[data-close-record]').click()
  await expect(surface).toHaveCount(0)

  stage = 'narrow board scrolling'
  await page.setViewportSize({ width: 390, height: 900 })
  const narrow = await board
    .locator('.database-grouped-board')
    .evaluate(element => ({
      width: element.clientWidth,
      scroll: element.scrollWidth,
      height: element.clientHeight,
      scrollHeight: element.scrollHeight
    }))
  assert.ok(narrow.scroll > narrow.width, 'Narrow boards scroll horizontally')
  assert.ok(
    narrow.scrollHeight <= narrow.height + 1,
    'Narrow boards retain full card heights'
  )
  await board.locator('.monolith-board-create').last().scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `.temp/table-flow-${engine}-narrow.png`,
    animations: 'disabled'
  })
  await expect(page.locator('body')).not.toContainText('[MISSING LOCALE]')
  assert.deepEqual(errors, [])
  result.passed = true
  console.log(
    `${engine}: complete table, board, property toggle and side page flow passed`
  )
} catch (error) {
  result.failure = String(error)
  result.stage = stage
  await page
    .screenshot({
      path: `.temp/table-flow-${engine}-failure.png`,
      animations: 'disabled'
    })
    .catch(() => {})
  writeFileSync(
    `.temp/table-flow-${engine}-failure.txt`,
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  )
  throw error
} finally {
  writeFileSync(
    `.temp/table-flow-${engine}-result.json`,
    JSON.stringify({ ...result, errors }, null, 2)
  )
  await browser.close()
}
