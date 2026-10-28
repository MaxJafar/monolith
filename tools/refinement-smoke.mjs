import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 }
})
const page = await context.newPage(),
  errors = []
const choose = async (container, label, option) => {
  await container.getByRole('button', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
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
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Monolith-Package-Names': '1'
        },
        data
      }
    )
    assert.ok(
      result.ok(),
      `${route}: ${result.status()} ${await result.text()}`
    )
    return (await result.json()).data
  }
  const workspace = await call('workspaces/create', {
    name: `Polish acceptance ${engine}`,
    profile: 'personal',
    icon: 'lucide:layers',
    description: 'Synthetic UI and database checks',
    enabled_modules: ['databases']
  })
  const scope = { workspace_id: workspace.id }
  const db = (route, data, query = {}) =>
    call(`workspaceDatabases/${route}`, data, { ...scope, ...query })
  const base = await db('createBase', {
    name: 'Design studio',
    initial_view: 'table',
    description: 'One consistent database experience.'
  })
  const number = await db('createField', {
    base_id: base.id,
    name: 'Estimate',
    kind: 'number'
  })
  const formula = await db('createField', {
    base_id: base.id,
    name: 'Double estimate',
    kind: 'formula',
    formula: 'prop("Estimate") * 2'
  })
  const status = await db('createField', {
    base_id: base.id,
    name: 'Stage',
    kind: 'status',
    options: ['Planned', 'In progress', 'Done']
  })
  const created = await db('createField', {
    base_id: base.id,
    name: 'Created',
    kind: 'created-time'
  })
  const record = await db('createRecord', {
    base_id: base.id,
    title: 'Launch polish',
    content: 'A reusable page body.',
    description: 'A description with a clear purpose.',
    appearance: {
      icon: 'lucide:sparkles',
      cover: { type: 'color', value: '#c5d7e8' }
    },
    values: { [number.id]: 4, [status.id]: 'In progress', [formula.id]: 999 }
  })
  await Promise.all(
    ['A useful comment', 'Another useful comment'].map(text =>
      db('addComment', { text }, { id: record.id })
    )
  )
  let snapshot = await db('snapshot')
  let saved = snapshot.records.find(r => r.id === record.id)
  assert.equal(saved.values[formula.id], 8)
  assert.ok(saved.values[created.id])
  assert.equal(saved.comments.length, 2)
  const template = {
    id: randomUUID(),
    name: 'Project brief',
    content: record.content,
    appearance: record.appearance,
    description: record.description,
    values: record.values,
    source_record_id: record.id
  }
  await db('saveTemplate', template, { id: base.id })
  snapshot = await db('snapshot')
  assert.equal(
    snapshot.bases.find(b => b.id === base.id).templates[0].name,
    'Project brief'
  )
  writeFileSync(
    `.temp/refinement-${engine}.json`,
    JSON.stringify(
      {
        workspace: workspace.id,
        base: base.id,
        record: record.id,
        number: number.id,
        formula: formula.id
      },
      null,
      2
    )
  )
  await page.goto(
    `http://localhost:5173/databases?workspace=${workspace.id}&base=${base.id}`
  )
  await expect(page.getByRole('table', { name: 'Design studio' })).toBeVisible({
    timeout: 45000
  })
  await expect(
    page.getByText('Change database view', { exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Launch polish', exact: true })
  ).toBeVisible()
  await page.getByRole('link', { name: 'Launch polish', exact: true }).click()
  const recordSurface = page.locator('.database-record-surface')
  await expect(recordSurface).toBeVisible()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'side'
  )
  await expect(
    recordSurface.getByText('A useful comment', { exact: true })
  ).toBeVisible()
  await expect(
    recordSurface.getByLabel('Add a description…', { exact: true })
  ).toHaveValue('A description with a clear purpose.')
  await recordSurface
    .getByRole('button', { name: 'Full page', exact: true })
    .click()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'full'
  )
  await recordSurface
    .getByRole('button', { name: 'Center overlay', exact: true })
    .click()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'overlay'
  )
  await recordSurface
    .getByLabel('Add a comment…', { exact: true })
    .fill('Posted from the page UI')
  await recordSurface
    .getByRole('button', { name: 'Post comment', exact: true })
    .click()
  await expect(
    recordSurface
      .locator('.database-comment')
      .filter({ hasText: 'Posted from the page UI' })
  ).toBeVisible()
  await recordSurface.evaluate(element => (element.scrollTop = 0))
  await page.waitForTimeout(350)
  await page.screenshot({ path: `.temp/refinement-${engine}-page.png` })
  await recordSurface
    .getByRole('button', { name: 'Back to database', exact: true })
    .click()
  await expect(recordSurface).toHaveCount(0)
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  const panel = page.locator('.database-floating-panel')
  await expect(panel).toBeVisible()
  for (const name of ['Layout', 'Property visibility', 'Filters', 'Sort'])
    await expect(panel.getByRole('button', { name: new RegExp('^' + name) })).toBeVisible()
  await expect(panel.getByText(/MISSING LOCALE/)).toHaveCount(0)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `.temp/refinement-${engine}-settings.png` })
  await panel.getByRole('button', { name: /^Layout/ }).click()
  await choose(panel, 'Group by', 'Stage')
  await panel
    .getByRole('checkbox', { name: 'Wrap cell content', exact: true })
    .uncheck()
  await panel.getByRole('button', { name: 'View settings', exact: true }).click()
  await panel
    .getByRole('button', { name: /^Property visibility/ })
    .click()
  await panel
    .getByRole('checkbox', { name: 'Item type', exact: true })
    .uncheck()
  await panel
    .getByRole('button', { name: 'Move Double estimate up', exact: true })
    .click()
  await panel.getByRole('button', { name: 'Save view', exact: true }).click()
  await expect(panel).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Stage: In progress', exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'Design studio' })
  ).toHaveAttribute('data-wrap', 'false')
  await expect(
    page.getByRole('columnheader', { name: 'Item type', exact: true })
  ).toHaveCount(0)
  const headers = await page
    .getByRole('table', { name: 'Design studio' })
    .getByRole('columnheader')
    .allTextContents()
  assert.ok(headers.indexOf('Double estimate') < headers.indexOf('Estimate'))
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  await panel.getByRole('button', { name: /^Layout/ }).click()
  await panel.getByRole('checkbox', { name: 'Lock view', exact: true }).check()
  await panel.getByRole('button', { name: 'Save view', exact: true }).click()
  await expect(panel).toHaveCount(0)
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  await panel.getByRole('button', { name: 'Unlock view', exact: true }).click()
  await expect(panel).toHaveCount(0)
  await page.getByRole('button', { name: 'New record', exact: true }).click()
  await expect(
    recordSurface.getByRole('button', { name: 'Project brief', exact: true })
  ).toBeVisible()
  await recordSurface
    .getByRole('button', { name: 'Project brief', exact: true })
    .click()
  await expect(
    recordSurface.getByLabel('Add a description…', { exact: true })
  ).toHaveValue('A description with a clear purpose.')
  await recordSurface
    .getByLabel('Title', { exact: true })
    .fill('From reusable template')
  await recordSurface
    .getByRole('button', { name: 'Save page', exact: true })
    .click()
  await expect(
    recordSurface.getByText('All changes saved', { exact: true })
  ).toBeVisible({ timeout: 20000 })
  snapshot = await db('snapshot')
  const fromTemplate = snapshot.records.find(
    r => r.title === 'From reusable template'
  )
  assert.ok(fromTemplate)
  assert.equal(fromTemplate.content, 'A reusable page body.')
  await recordSurface
    .getByRole('button', { name: 'Back to database', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true })
  ).toHaveCount(1)
  await expect(
    page
      .locator('.monolith-page-bar')
      .getByRole('button', { name: 'Undo', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await choose(settings, 'Open database pages in', 'Center overlay')
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Launch polish', exact: true }).click()
  await expect(page.locator('.database-record-backdrop')).toHaveAttribute(
    'data-mode',
    'overlay'
  )
  await recordSurface
    .getByRole('button', { name: 'Add cover', exact: true })
    .click()
  const cover = page.getByRole('dialog', { name: 'Customize', exact: true })
  await cover
    .getByRole('button', { name: 'Cover color #d8dfd0', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await recordSurface
    .getByRole('button', { name: 'Save page', exact: true })
    .click()
  await expect(
    recordSurface.getByText('All changes saved', { exact: true })
  ).toBeVisible()
  await recordSurface
    .getByRole('button', { name: 'Back to database', exact: true })
    .click()
  const pages = []
  for (let i = 1; i <= 8; i++)
    pages.push(
      await call(
        'workspaces/createPage',
        { title: `Acceptance page ${i}`, parent_id: null },
        scope
      )
    )
  await page.reload()
  const nav = page.locator('#workspace-navigation')
  await expect(
    nav.getByRole('link', { name: 'Acceptance page 1', exact: true })
  ).toBeVisible()
  await expect(
    nav.getByRole('link', { name: 'Acceptance page 8', exact: true })
  ).toHaveCount(0)
  await nav.getByRole('button', { name: /Show \d+ more/ }).click()
  await expect(
    nav.getByRole('link', { name: 'Acceptance page 8', exact: true })
  ).toBeVisible()
  await nav.getByRole('button', { name: 'Show less', exact: true }).click()
  await nav
    .getByRole('button', { name: 'Options for Acceptance page 1', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'Icon and color', exact: true })
    .click()
  const iconPicker = page.getByRole('dialog', { name: 'Rename', exact: true })
  await expect(iconPicker).toBeVisible()
  await iconPicker.getByRole('searchbox').fill('star')
  await iconPicker.getByRole('button', { name: 'star', exact: true }).click()
  await iconPicker.getByRole('button', { name: 'Pink', exact: true }).click()
  await iconPicker.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(iconPicker).toHaveCount(0)
  await nav.getByRole('button', { name: 'Create group', exact: true }).click()
  const folder = page.getByRole('dialog', { name: 'Group name', exact: true })
  await folder.getByRole('textbox', { name: 'Group name', exact: true }).fill('Acceptance folder')
  await folder.getByRole('button', { name: 'Blue', exact: true }).click()
  await folder.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(folder).toHaveCount(0)
  await expect(nav.getByText('Acceptance folder', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Page settings and actions', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'Appearance and layout', exact: true })
    .click()
  const customization = page.locator(
    '[role="dialog"][data-workspace-overlay="customization"]'
  )
  await expect(customization).toBeVisible()
  await expect(customization.locator('.workspace-settings-nav')).toBeVisible()
  assert.ok(
    (await customization.locator('.workspace-settings-nav').boundingBox())
      .width < 300,
    'Customization navigation must leave room for the content'
  )
  assert.ok(
    (await customization.locator('.workspace-settings-content').boundingBox())
      .width > 500,
    'Customization controls must remain visible'
  )
  await customization.getByRole('button', { name: 'Rose', exact: true }).click()
  await customization
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .click()
  await expect(
    customization.getByRole('status').filter({ hasText: 'Appearance saved' })
  ).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({
    path: `.temp/refinement-${engine}-customization.png`
  })
  await customization
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('body')).not.toContainText('MISSING LOCALE')
  await page.screenshot({ path: `.temp/refinement-${engine}-mobile.png` })
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      engine,
      passed: true,
      checks: [
        'computed properties',
        'concurrent comments',
        'persistent templates',
        'record peeks',
        'presentation preference',
        'grouping and property order',
        'view locking',
        'cover gallery',
        'sidebar expansion and icons',
        'customization overlay',
        'mobile layout'
      ],
      workspace: workspace.id
    })
  )
} catch (error) {
  await page
    .screenshot({ path: `.temp/refinement-${engine}-failure.png` })
    .catch(() => {})
  writeFileSync(
    `.temp/refinement-${engine}-failure.txt`,
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  )
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
