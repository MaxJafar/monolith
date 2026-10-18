// Exercises only synthetic local workspaces; never prints session credentials.
import { resolveAddonIdentity } from '@monolith/configs/node'
import { expect as baseExpect, chromium, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const expect = baseExpect.configure({ timeout: 20000 })
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 }
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
let stage = 'setup'
const result = { engine, passed: false }
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  async function api(route, data, query = {}) {
    const response = await context.request.fetch(
      `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    assert.ok(response.ok(), `${route}: ${response.status()}`)
    return (await response.json()).data
  }
  const workspace = await api('workspaces/create', {
    name: `UI polish ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:layers',
    description: 'Synthetic UI acceptance',
    enabled_modules: ['databases']
  })
  const db = (route, data, query = {}) =>
    api('workspaceDatabases/' + route, data, {
      workspace_id: workspace.id,
      ...query
    })
  const snapshot = () => db('snapshot')
  const linked = await db('createBase', {
    name: 'Release backlog',
    description: '',
    initial_view: 'table',
    view_name: 'All releases'
  })
  await db('createView', {
    base_id: linked.id,
    name: 'Release board',
    mode: 'kanban',
    group_field_id: null,
    config: { group_property: 'done' }
  })
  const record = await db('createRecord', {
    base_id: linked.id,
    title: 'Ship the next release',
    content: 'Acceptance record',
    values: {}
  })
  const id = randomUUID()
  await api('workspaces/savePage', {
    id,
    workspace_id: workspace.id,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title: 'Workspace studio',
      icon: 'lucide:layers',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        {
          id: randomUUID(),
          type: 'document',
          title: '',
          content: 'Plan the work. Keep it connected.',
          width: 'full',
          url: '',
          widget: ''
        }
      ]
    }
  })
  const pageUrl = `http://localhost:5173/page/${id}?workspace=${workspace.id}`
  await page.goto(pageUrl)
  const prose = page.locator('.tiptap[contenteditable="true"]').first()
  await expect(prose).toBeVisible()
  await expect(prose).toContainText('Plan the work. Keep it connected.')
  async function changeTheme(name) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings.getByRole('button', { name: 'Theme', exact: true }).click()
    const saved = page.waitForResponse(response =>
      response.url().includes('/personalization/updatePersonalization')
    )
    await page.getByRole('option', { name, exact: true }).click()
    assert.ok((await saved).ok())
    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(settings).toHaveCount(0)
    await expect(page.locator('html')).toHaveClass(
      name === 'Dark' ? /dark/ : /^(?!.*dark).*$/
    )
  }
  await changeTheme('Light')
  async function openInline() {
    await prose.locator(':scope > p').last().click()
    await expect(prose).toBeFocused()
    await page.keyboard.press('End')
    await expect
      .poll(() =>
        prose.evaluate(node => {
          const selection = window.getSelection()
          const anchor = selection?.anchorNode
          const paragraph = (
            anchor instanceof Element ? anchor : anchor?.parentElement
          )?.closest('p')
          if (!node.contains(paragraph) || !anchor) return false
          const remainder = document.createRange()
          remainder.selectNodeContents(paragraph)
          remainder.setStart(anchor, selection.anchorOffset)
          return remainder.toString() === ''
        })
      )
      .toBe(true)
    await page.keyboard.press('Enter')
    await page.keyboard.type('/database')
    await page
      .getByRole('option', { name: 'Inline database', exact: true })
      .click()
    const picker = page.getByRole('dialog', {
      name: 'Inline database',
      exact: true
    })
    await expect(picker).toBeVisible()
    return picker
  }
  async function bounds(surface) {
    const box = await surface.boundingBox()
    const viewport = page.viewportSize()
    assert.ok(
      box.x >= 10 &&
        box.y >= 10 &&
        box.x + box.width <= viewport.width - 10 &&
        box.y + box.height <= viewport.height - 10,
      'Popover stays inside the viewport'
    )
    assert.equal(
      await surface.evaluate(node => node.scrollWidth > node.clientWidth + 1),
      false,
      'No horizontal popover overflow'
    )
  }

  stage = 'inline layout menu'
  let picker = await openInline()
  await expect(picker.locator('form')).toHaveCount(0)
  for (const name of [
    'Table',
    'Board',
    'Gallery',
    'List',
    'Chart',
    'Dashboard',
    'Timeline',
    'Calendar'
  ])
    await expect(
      picker.getByRole('button', { name, exact: true })
    ).toBeVisible()
  await bounds(picker)
  await page.screenshot({
    path: `.temp/ui-polish-${engine}-create-light.png`,
    animations: 'disabled'
  })
  await picker.getByRole('button', { name: 'Board', exact: true }).click()
  const first = page.locator('.monolith-inline-database').first()
  await expect(
    first.getByRole('heading', { name: 'New database', exact: true })
  ).toBeVisible()
  const created = (await snapshot()).bases.find(base => base.id !== linked.id)
  assert.equal(
    (await snapshot()).views.find(view => view.base_id === created.id).mode,
    'kanban'
  )
  await first
    .getByRole('button', { name: 'Rename New database', exact: true })
    .click()
  await first
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill('Studio board')
  await first
    .getByRole('textbox', { name: 'Database name', exact: true })
    .press('Enter')
  await expect(
    first.getByRole('heading', { name: 'Studio board', exact: true })
  ).toBeVisible()
  assert.equal(page.url(), pageUrl)

  stage = 'existing database search and view selection'
  picker = await openInline()
  await picker
    .getByRole('button', { name: 'Link an existing database', exact: true })
    .click()
  const search = picker.getByRole('searchbox', {
    name: 'Search databases…',
    exact: true
  })
  await search.fill('Release')
  await expect(search).toBeFocused()
  await picker
    .getByRole('button', { name: 'Release backlog', exact: true })
    .click()
  await expect(
    picker.locator('.monolith-database-picker-row').first()
  ).toBeFocused()
  await picker
    .getByRole('button', { name: 'Release board', exact: true })
    .click()
  await expect(page.locator('.monolith-inline-database')).toHaveCount(2)
  await expect(
    page
      .locator('.monolith-inline-database')
      .last()
      .getByText(record.title, { exact: true })
      .first()
  ).toBeVisible()
  assert.equal(
    (await snapshot()).bases.length,
    2,
    'Linking does not duplicate the database'
  )

  stage = 'creation failure and recovery'
  picker = await openInline()
  await page.route('**/workspaceDatabases/createBase*', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Temporarily unavailable',
        error: 'Temporarily unavailable'
      })
    })
  )
  await picker.getByRole('button', { name: 'Table', exact: true }).click()
  await expect(picker.getByRole('alert')).toBeVisible()
  await expect(
    picker.getByRole('button', { name: 'Table', exact: true })
  ).toBeEnabled()
  await page.unroute('**/workspaceDatabases/createBase*')
  await picker.getByRole('button', { name: 'Table', exact: true }).click()
  await expect(page.locator('.monolith-inline-database')).toHaveCount(3)
  await expect(
    page.getByText('All changes saved', { exact: true }).first()
  ).toBeAttached()
  await page.reload()
  await expect(page.locator('.monolith-inline-database')).toHaveCount(3)
  await expect(
    page.getByRole('heading', { name: 'Studio board', exact: true })
  ).toBeVisible()

  stage = 'database catalog creation'
  await page.goto(`http://localhost:5173/databases?workspace=${workspace.id}`)
  await page.getByRole('button', { name: 'New database', exact: true }).click()
  let menu = page.getByRole('dialog', { name: 'New database', exact: true })
  await expect(menu.locator('form')).toHaveCount(0)
  await bounds(menu)
  await menu.getByRole('button', { name: 'Gallery', exact: true }).click()
  await expect(page.locator('.database-browser')).toBeVisible()
  const selected = new URL(page.url()).searchParams.get('base')
  assert.equal(
    (await snapshot()).views.find(view => view.base_id === selected).mode,
    'gallery'
  )

  stage = 'view settings, focus and mobile geometry'
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  menu = page.getByRole('dialog', { name: 'View settings', exact: true })
  await bounds(menu)
  await page.screenshot({
    path: `.temp/ui-polish-${engine}-settings-light.png`,
    animations: 'disabled'
  })
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await page.goto(pageUrl)
  await changeTheme('Dark')
  picker = await openInline()
  await page.screenshot({
    path: `.temp/ui-polish-${engine}-create-dark.png`,
    animations: 'disabled'
  })
  await page.setViewportSize({ width: 390, height: 760 })
  await bounds(picker)
  await page.screenshot({
    path: `.temp/ui-polish-${engine}-create-mobile.png`,
    animations: 'disabled'
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(
    await picker.evaluate(node => getComputedStyle(node).animationName),
    'none'
  )
  await page.keyboard.press('Escape')
  await expect(picker).toHaveCount(0)
  await expect(page.locator('.monolith-surface-exit')).toHaveCount(0)
  assert.deepEqual(errors, [])
  Object.assign(result, {
    passed: true,
    workspace: workspace.id,
    page: id,
    checks: [
      'one-click layouts',
      'rename inline',
      'linked view search',
      'failure and retry',
      'persistence',
      'catalog layouts',
      'focus',
      'desktop/mobile bounds',
      'light/dark',
      'reduced motion'
    ]
  })
} catch (error) {
  result.stage = stage
  result.error = String(error)
  result.selection = await page
    .evaluate(() => {
      const selection = window.getSelection()
      return {
        node: selection?.anchorNode?.nodeName,
        text: selection?.anchorNode?.textContent?.slice(0, 80),
        offset: selection?.anchorOffset
      }
    })
    .catch(() => null)
  await page
    .screenshot({
      path: `.temp/ui-polish-${engine}-failure.png`,
      fullPage: true
    })
    .catch(() => {})
  throw error
} finally {
  writeFileSync(
    `.temp/ui-polish-${engine}-result.json`,
    JSON.stringify(result, null, 2)
  )
  await browser.close()
}
console.log(JSON.stringify(result))
