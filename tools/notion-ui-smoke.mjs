import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const { workspace } = JSON.parse(
  readFileSync('.temp/widgets-webkit-canonical.json', 'utf8')
)
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 }
})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  const call = async (route, data, query = {}) => {
    const result = await context.request.fetch(
      `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    assert.ok(
      result.ok(),
      `${route}: ${result.status()} ${result.ok() ? '' : await result.text()}`
    )
    return (await result.json()).data
  }
  const settings = (await call('workspaces/list')).find(
    item => item.id === workspace
  )
  assert.ok(
    settings?.name.startsWith('Widget studio'),
    'Use only the synthetic acceptance workspace'
  )
  const scope = { workspace_id: workspace }
  const db = (route, data, query = {}) =>
    call(`workspaceDatabases/${route}`, data, { ...scope, ...query })
  const id = randomUUID(),
    suffix = `${engine}-${id.slice(0, 6)}`
  const title = `Notion UI acceptance ${suffix}`
  await call('workspaces/savePage', {
    id,
    workspace_id: workspace,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title,
      icon: 'lucide:file-text',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        {
          id: randomUUID(),
          type: 'document',
          title: '',
          content: 'Database and callout reference',
          width: 'full',
          url: '',
          widget: ''
        }
      ]
    }
  })
  await page.goto(`http://localhost:5173/page/${id}?workspace=${workspace}`)
  await expect(page.locator('editor-host')).toBeVisible({ timeout: 45000 })
  const firstParagraph = page
    .locator('affine-paragraph [contenteditable="true"]')
    .first()
  await firstParagraph.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/database')
  await page
    .getByRole('option', { name: /Inline database/ })
    .first()
    .click()
  const picker = page.getByRole('region', {
    name: 'Inline database',
    exact: true
  })
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill(`Reference database ${suffix}`)
  await picker
    .getByRole('button', { name: 'New empty data source', exact: true })
    .click()
  const table = page.getByRole('table', {
    name: `Reference database ${suffix}`
  })
  await expect(table).toBeVisible({ timeout: 30000 })
  await page.screenshot({
    path: `.temp/notion-${engine}-inline.png`,
    fullPage: true
  })
  await table.getByRole('button', { name: 'New page', exact: true }).click()
  const input = table.locator('input').last()
  await input.fill('Reference item')
  await input.press('Enter')
  const row = table.locator('tr').filter({ hasText: 'Reference item' })
  await expect(row).toBeVisible()
  const initialSnapshot = await db('snapshot')
  const initialBase = initialSnapshot.bases.find(
    item => item.name === `Reference database ${suffix}`
  )
  const initialRecord = initialSnapshot.records.find(
    item => item.base_id === initialBase.id
  )
  await db(
    'updateRecord',
    {
      appearance: { accent: '#c14c8a' },
      expected_updated: initialRecord.updated
    },
    { id: initialRecord.id }
  )
  const navigation = (await call('workspaces/list')).find(
    item => item.id === workspace
  ).navigation
  await call(
    'workspaces/saveAppearance',
    {
      scope: 'page',
      key: `/page/${id}`,
      appearance: { accent: '#a05dcc' },
      expected_revision: navigation.revision
    },
    scope
  )
  await page.reload()
  await expect(row).toBeVisible({ timeout: 30000 })
  await row.locator('td').first().click()
  await expect(row.locator('td').first()).toHaveAttribute(
    'data-selected',
    'true'
  )
  assert.equal(
    await row.evaluate(element =>
      getComputedStyle(element).getPropertyValue('--selection-color').trim()
    ),
    '#a05dcc'
  )
  await row.hover()
  await row.getByRole('button', { name: /Open.*Reference item/i }).click()
  const surface = page.locator('.database-record-surface')
  await expect(surface).toBeVisible()
  await surface
    .getByRole('button', { name: /^(Add a property|Add field)$/ })
    .click()
  const fieldPicker = page.locator('.database-property-picker')
  await fieldPicker.locator('input').first().fill('Tags')
  assert.equal(
    await fieldPicker.evaluate(element =>
      getComputedStyle(element).getPropertyValue('--selection-color').trim()
    ),
    '#c14c8a'
  )
  await page.screenshot({
    path: `.temp/notion-${engine}-property-picker.png`,
    animations: 'disabled',
    fullPage: true
  })
  await fieldPicker
    .getByRole('button', { name: 'Multi-select', exact: true })
    .click()
  await surface
    .getByRole('button', { name: 'Tags', exact: true })
    .last()
    .click()
  const valuePicker = page.locator('.database-value-popover')
  await valuePicker.getByRole('textbox').fill('Design')
  await valuePicker.getByRole('textbox').press('Enter')
  await expect(surface.locator('.database-page-properties')).toContainText(
    'Design'
  )
  await valuePicker
    .getByRole('button', { name: /Color.*Design|Design.*color/i })
    .click()
  await valuePicker.locator('input[type=color]').fill('#337ea9')
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => {
      const snapshot = await db('snapshot')
      const base = snapshot.bases.find(
        item => item.name === `Reference database ${suffix}`
      )
      const field = snapshot.fields.find(
        item => item.base_id === base.id && item.name === 'Tags'
      )
      return snapshot.records.find(item => item.base_id === base.id)?.values[
        field.id
      ]
    })
    .toEqual(['Design'])
  await expect(surface.locator('.database-comments')).toBeVisible()
  await surface
    .getByRole('button', { name: 'Right side peek', exact: true })
    .click()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'side'
  )
  await page.screenshot({
    path: `.temp/notion-${engine}-side-peek.png`,
    fullPage: true
  })
  await surface.getByRole('button', { name: 'Full page', exact: true }).click()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'full'
  )
  await page.screenshot({
    path: `.temp/notion-${engine}-full-page.png`,
    fullPage: true
  })
  await surface.locator('[data-close-record]').click()
  await expect(surface).toHaveCount(0)
  await expect(row).toContainText('Design')
  const paragraph = page.locator('affine-paragraph').first()
  await paragraph.locator('[contenteditable="true"]').first().click()
  await page.keyboard.press('Home')
  await page.keyboard.type('/callout', { delay: 50 })
  await page.getByRole('option', { name: 'Callout', exact: true }).click()
  const callout = page.locator('affine-callout').first()
  await expect(callout).toBeVisible()
  const sourceGrip = page
    .locator('monolith-application-block > .monolith-document-grip')
    .first()
  const sourcePoint = await sourceGrip.boundingBox()
  const targetPoint = await callout
    .locator('affine-paragraph')
    .first()
    .boundingBox()
  assert.ok(sourcePoint && targetPoint)
  await page.mouse.move(
    sourcePoint.x + sourcePoint.width / 2,
    sourcePoint.y + sourcePoint.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetPoint.x + 60,
    targetPoint.y + targetPoint.height - 2,
    { steps: 15 }
  )
  await expect(page.locator('.monolith-document-drop')).toBeVisible()
  await page.mouse.up()
  await expect(callout.locator('monolith-application-block')).toHaveCount(1)
  await callout
    .locator(':scope > .monolith-document-grip')
    .click({ button: 'right' })
  await page
    .getByRole('menuitem', { name: 'Background color', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'Orange background', exact: true })
    .click()
  await expect(callout).toHaveAttribute('data-monolith-background', 'true')
  await paragraph.locator('[contenteditable="true"]').first().click()
  await expect(callout).toHaveAttribute('data-monolith-selected', 'false')
  await expect
    .poll(() =>
      callout.evaluate(element =>
        getComputedStyle(
          element.querySelector('.affine-callout-block-container')
        ).getPropertyValue('--monolith-block-background')
      )
    )
    .toContain('#d9730d')
  await page.screenshot({
    path: `.temp/notion-${engine}-callout.png`,
    animations: 'disabled',
    fullPage: true
  })
  const snapshot = await db('snapshot')
  const base = snapshot.bases.find(
    item => item.name === `Reference database ${suffix}`
  )
  const field = snapshot.fields.find(
    item => item.base_id === base.id && item.name === 'Tags'
  )
  const record = snapshot.records.find(item => item.base_id === base.id)
  assert.equal(field.config.option_colors.Design, '#337ea9')
  const stage = await db('createField', {
    base_id: base.id,
    name: 'Stage',
    kind: 'status',
    options: ['Planned', 'Doing'],
    option_colors: { Planned: '#cb912f', Doing: '#9065b0' }
  })
  const patched = await db(
    'updateRecord',
    {
      values: { ...record.values, [stage.id]: 'Doing' },
      expected_updated: record.updated
    },
    { id: record.id }
  )
  assert.equal(patched.title, 'Reference item')
  assert.equal(patched.content, record.content)
  const view = await db('createView', {
    base_id: base.id,
    name: 'Grouped board',
    mode: 'kanban',
    group_field_id: stage.id,
    config: {
      sub_group_by: field.id,
      color: { by: field.id, palette: {}, columns: true }
    }
  })
  await page.goto(
    `http://localhost:5173/databases?workspace=${workspace}&base=${base.id}&view=${view.id}`
  )
  const group = page.getByRole('button', { name: /Design 1/ })
  await expect(group).toBeVisible({ timeout: 30000 })
  const card = page
    .locator('.monolith-board-card')
    .filter({ hasText: 'Reference item' })
  await expect(card).toBeVisible()
  await group.click()
  await expect(card).toBeHidden()
  await group.click()
  await expect(card).toBeVisible()
  assert.match(await card.getAttribute('style'), /337ea9/)
  await card.dragTo(page.locator('.database-board-cell[aria-label="Planned"]'))
  await expect
    .poll(
      async () =>
        (await db('snapshot')).records.find(item => item.id === record.id)
          ?.values[stage.id]
    )
    .toBe('Planned')
  await expect(card).toBeVisible()
  assert.match(await card.getAttribute('style'), /337ea9/)
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  await expect(page.locator('.database-view-settings')).toBeVisible()
  await page.screenshot({
    path: `.temp/notion-${engine}-grouped-board.png`,
    animations: 'disabled',
    fullPage: true
  })
  await page
    .getByRole('button', { name: 'Conditional color', exact: true })
    .click()
  await expect(page.getByLabel('Color for Design')).toHaveValue('#337ea9')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(card).toBeVisible({ timeout: 30000 })
  await page.goto(`http://localhost:5173/page/${id}?workspace=${workspace}`)
  await expect(callout.locator('monolith-application-block')).toHaveCount(1, {
    timeout: 30000
  })
  await expect(callout).toHaveAttribute('data-monolith-background', 'true')
  await expect(callout).toContainText('Reference item')
  assert.deepEqual(errors, [])
  writeFileSync(
    `.temp/notion-${engine}-result.json`,
    JSON.stringify(
      {
        engine,
        page: id,
        base: base.id,
        record: record.id,
        field: field.id,
        checks: [
          'inline creation',
          'row creation',
          'selection',
          'property creation',
          'tag creation',
          'shared color',
          'side peek',
          'full page',
          'comments',
          'callout creation and color menu',
          'dragging an inline database into a callout',
          'board drag updates shared data',
          'partial patch preservation',
          'collapsible board groups',
          'settings',
          'reload'
        ],
        errors
      },
      null,
      2
    )
  )
  console.log(`${engine}: full page/database interaction flow passed`)
} catch (error) {
  await page
    .screenshot({ path: `.temp/notion-${engine}-failure.png`, fullPage: true })
    .catch(() => {})
  writeFileSync(
    `.temp/notion-${engine}-failure.txt`,
    (await page.locator('body').innerText()).slice(0, 18000)
  )
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}

