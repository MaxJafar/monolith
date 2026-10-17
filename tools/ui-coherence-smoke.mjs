import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1480, height: 1080 }
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', e => errors.push(e.message))
let workspace, base
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  const call = async (route, data, query = {}) => {
    const response = await context.request.fetch(
      'http://localhost:3636/modules/' +
        remote +
        '/' +
        route +
        '?' +
        new URLSearchParams(query),
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: 'Bearer ' + token },
        data
      }
    )
    assert.ok(
      response.ok(),
      route +
        ': ' +
        response.status() +
        ' ' +
        (response.ok() ? '' : await response.text())
    )
    return (await response.json()).data
  }
  workspace = await call('workspaces/create', {
    name: 'UI coherence ' + engine + ' ' + Date.now(),
    profile: 'personal',
    icon: 'lucide:layers',
    description: 'Synthetic acceptance',
    enabled_modules: ['databases']
  })
  const scope = { workspace_id: workspace.id }
  const db = (route, data, query = {}) =>
    call('workspaceDatabases/' + route, data, { ...scope, ...query })
  base = await db('createBase', {
    name: 'Interaction database',
    description: '',
    initial_view: 'table'
  })
  const stage = await db('createField', {
    base_id: base.id,
    name: 'Stage',
    kind: 'select',
    options: ['Design', 'Build']
  })
  const estimate = await db('createField', {
    base_id: base.id,
    name: 'Estimate',
    kind: 'number'
  })
  const date = new Date().toISOString().slice(0, 10)
  const records = []
  for (const [title, group, number] of [
    ['Alpha brief', 'Design', 6],
    ['Beta launch', 'Build', 4],
    ['Gamma notes', 'Design', 2]
  ])
    records.push(
      await db('createRecord', {
        base_id: base.id,
        title,
        content: 'Opening paragraph',
        values: { [stage.id]: group, [estimate.id]: number },
        date: date + 'T12:00:00.000Z'
      })
    )
  let snapshot = await db('snapshot')
  const view = snapshot.views.find(v => v.base_id === base.id)
  const navigation = (await call('workspaces/list')).find(
    w => w.id === workspace.id
  ).navigation
  await call(
    'workspaces/saveAppearance',
    {
      scope: 'workspace',
      appearance: { accent: '#9b61cc' },
      expected_revision: navigation.revision
    },
    scope
  )
  const url =
    'http://localhost:5173/databases?' +
    new URLSearchParams({
      workspace: workspace.id,
      base: base.id,
      view: view.id
    })
  await page.goto(url)
  const table = page.getByRole('table', { name: base.name, exact: true })
  await expect(table).toBeVisible({ timeout: 45000 })
  console.log('table loaded')
  await page.locator('.monolith-view-tabs a[aria-current="page"]').click()
  let popup = page.getByRole('dialog', { name: 'View appearance', exact: true })
  await expect(popup).toBeVisible()
  await expect(popup.getByText('Layout', { exact: true })).toHaveCount(0)
  await popup
    .getByRole('textbox', { name: 'View name', exact: true })
    .fill('Studio')
  await popup.getByLabel('Text color', { exact: true }).fill('#9b61cc')
  await page.screenshot({
    path: '.temp/coherence-' + engine + '-tab.png',
    animations: 'disabled'
  })
  await page.keyboard.press('Escape')
  await expect
    .poll(
      async () => (await db('snapshot')).views.find(v => v.id === view.id).name
    )
    .toBe('Studio')
  console.log('appearance autosaved')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'Filters', exact: true })
  await popup
    .getByRole('textbox', { name: 'Filter by…', exact: true })
    .fill('Title')
  await popup.locator('.database-filter-properties button').first().click()
  await popup.getByRole('textbox', { name: 'Value', exact: true }).fill('Alpha')
  await expect(table.locator('tbody .database-title-cell')).toHaveCount(1)
  await popup
    .getByRole('button', { name: 'Add filter group', exact: true })
    .click()
  await popup
    .locator('.database-filter-group')
    .getByRole('textbox', { name: 'Value', exact: true })
    .fill('Beta')
  const combine = popup
    .locator('.database-filter-group-heading')
    .last()
    .getByRole('button')
    .first()
  await combine.click()
  await page.getByRole('option', { name: 'Or', exact: true }).click()
  await expect(table.locator('tbody .database-title-cell')).toHaveCount(2)
  await page.screenshot({
    path: '.temp/coherence-' + engine + '-filters.png',
    animations: 'disabled'
  })
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(table.locator('tbody .database-title-cell')).toHaveCount(2, {
    timeout: 30000
  })
  console.log('advanced filters persisted')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByRole('button', { name: 'Delete filter', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(table.locator('tbody .database-title-cell')).toHaveCount(3)
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'View settings', exact: true })
  await expect(popup.getByText('Layout', { exact: true })).toBeVisible()
  await expect(
    popup.getByRole('button', { name: 'Save view', exact: true })
  ).toHaveCount(0)
  await page.screenshot({
    path: '.temp/coherence-' + engine + '-settings.png',
    animations: 'disabled'
  })
  await page.keyboard.press('Escape')
  for (const mode of ['Chart', 'Dashboard', 'Timeline']) {
    await page
      .getByRole('button', { name: 'New view', exact: true })
      .first()
      .click()
    await page
      .locator('.database-view-layout-grid')
      .getByRole('button', { name: mode, exact: true })
      .click()
    await expect(
      page.locator('.database-' + mode.toLowerCase()).first()
    ).toBeVisible()
    if (mode === 'Chart') {
      await page
        .getByRole('button', { name: 'View settings', exact: true })
        .click()
      popup = page.getByRole('dialog', { name: 'View settings', exact: true })
      await popup.getByRole('button', { name: /^Layout/ }).click()
      await popup.getByRole('button', { name: 'Group by', exact: true }).click()
      await page.getByRole('option', { name: 'Stage', exact: true }).click()
      await page.keyboard.press('Escape')
      await expect(page.locator('.database-chart-row')).toHaveCount(2)
    }
    if (mode === 'Timeline')
      await expect(page.locator('.database-timeline-bar')).toHaveCount(3)
    await page.screenshot({
      path: '.temp/coherence-' + engine + '-' + mode.toLowerCase() + '.png',
      animations: 'disabled'
    })
    await page.reload()
    await expect(
      page.locator('.database-' + mode.toLowerCase()).first()
    ).toBeVisible({ timeout: 30000 })
  }
  console.log('three layouts persisted')
  await page.getByRole('link', { name: 'Studio', exact: true }).click()
  const row = table.locator('tr').filter({
    has: page.getByRole('link', { name: 'Alpha brief', exact: true })
  })
  await row.hover()
  await row.getByRole('button', { name: /Open Alpha brief/ }).click()
  const surface = page.locator('.database-record-surface').last()
  await expect(surface).toBeVisible()
  await surface
    .getByRole('button', { name: 'Right side peek', exact: true })
    .click()
  const editor = surface.locator('.zillion-prose').first()
  await expect(editor).toBeVisible()
  await editor.locator(':scope > p').last().click()
  // Allow Chromium's native selectionchange to reach ProseMirror before Enter.
  await page.keyboard.press('End', { delay: 80 })
  await page.keyboard.press('Enter')
  await page.keyboard.type('/database', { delay: 15 })
  await page
    .getByRole('option', { name: 'Inline database', exact: true })
    .click()
  const picker = page.getByRole('region', {
    name: 'Inline database',
    exact: true
  })
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill('Inside the page')
  await picker
    .getByRole('button', { name: 'New empty data source', exact: true })
    .click()
  await expect(
    surface.getByRole('table', { name: 'Inside the page', exact: true })
  ).toBeVisible({ timeout: 30000 })
  await expect(
    surface.getByRole('link', { name: 'Table', exact: true })
  ).toBeVisible()
  const resize = surface.getByRole('separator', {
    name: 'Resize database',
    exact: true
  })
  await resize.focus()
  const resizedHeight = Math.max(240, Math.min(1200, await surface.locator('.monolith-inline-viewport').evaluate(element => element.clientHeight) + 40))
  await page.keyboard.press('ArrowDown')
  await expect(resize).toHaveAttribute('aria-valuenow', String(resizedHeight))
  await expect
    .poll(
      async () =>
        (await db('snapshot')).records.find(r => r.id === records[0].id).content
    )
    .toContain(`"height":${resizedHeight}`)
  console.log('inline database and resize persisted')
  // A full block stays intact during drag, and cancellation restores its location.
  const handles = surface.locator('.monolith-block-grips > button')
  const handle = handles.nth(1)
  await handle.hover({ force: true })
  const point = await handle.boundingBox()
  await page.mouse.move(point.x + 5, point.y + 5)
  await page.mouse.down()
  await page.mouse.move(point.x + 90, point.y + 45, { steps: 8 })
  await expect(page.locator('.monolith-block-drag-preview')).toBeVisible()
  await page.screenshot({
    path: '.temp/coherence-' + engine + '-record-drag.png'
  })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('.monolith-block-drag-preview')).toHaveCount(0)
  await surface
    .getByRole('button', { name: 'Center overlay', exact: true })
    .click()
  await expect(surface.locator('.monolith-inline-database-block')).toHaveCount(
    1
  )
  await page.screenshot({
    path: '.temp/coherence-' + engine + '-record.png',
    animations: 'disabled'
  })
  await surface.locator('[data-close-record]').click()
  await expect(surface).toHaveCount(0)
  await page.reload()
  await expect(table).toBeVisible({ timeout: 30000 })
  await row.hover()
  await row.getByRole('button', { name: /Open Alpha brief/ }).click()
  await expect(
    page.locator('.database-record-surface .monolith-inline-database-block')
  ).toHaveCount(1)
  await expect(
    page
      .locator('.database-record-surface')
      .getByRole('separator', { name: 'Resize database', exact: true })
  ).toHaveAttribute('aria-valuenow', String(resizedHeight))
  console.log('record round-trip passed')
  await expect(page.locator('body')).not.toContainText('[MISSING LOCALE]')
  assert.deepEqual(errors, [])
  writeFileSync(
    '.temp/coherence-' + engine + '-result.json',
    JSON.stringify(
      {
        workspace: workspace.id,
        base: base.id,
        record: records[0].id,
        url,
        errors
      },
      null,
      2
    )
  )
} catch (error) {
  console.error(error)
  await page
    .screenshot({
      path: '.temp/coherence-' + engine + '-failure.png',
      fullPage: true,
      timeout: 10000
    })
    .catch(() => {})
  writeFileSync(
    '.temp/coherence-' + engine + '-failure.json',
    JSON.stringify(
      {
        workspace: workspace?.id,
        base: base?.id,
        url: page.url(),
        errors,
        body: await page
          .locator('body')
          .innerText()
          .catch(() => '')
      },
      null,
      2
    )
  )
  process.exitCode = 1
} finally {
  await browser.close()
}
