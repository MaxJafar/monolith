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
const page = await context.newPage(),
  errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  const call = async (route, data, query = {}) => {
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
  const settings = (await call('workspaces/list')).find(
    item => item.id === workspace
  )
  assert.ok(
    settings && settings.name.startsWith('Widget studio'),
    'Only modify the synthetic acceptance workspace'
  )
  if (!settings.enabled_modules.includes('atlas'))
    await call(
      'workspaces/update',
      {
        name: settings.name,
        profile: settings.profile,
        icon: settings.icon,
        description: settings.description,
        enabled_modules: [...settings.enabled_modules, 'atlas']
      },
      { id: workspace }
    )
  const scope = { workspace_id: workspace },
    id = randomUUID(),
    suffix = `${engine} ${id.slice(0, 6)}`
  const title = `Atlas coherence ${suffix}`,
    baseTitle = `Connected collection ${suffix}`
  const base = await call(
    'workspaceDatabases/createBase',
    { name: baseTitle, initial_view: 'table' },
    scope
  )
  const record = await call(
    'workspaceDatabases/createRecord',
    {
      base_id: base.id,
      title: `Shared record ${suffix}`,
      content: 'Record from the shared database',
      values: {}
    },
    scope
  )
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
          content: 'Canonical coherence',
          width: 'full',
          url: '',
          widget: ''
        },
        {
          id: randomUUID(),
          type: 'database',
          title: '',
          content: '',
          width: 'full',
          url: '',
          widget: '',
          database: { workspaceId: workspace, baseId: base.id }
        }
      ]
    }
  })
  const atlasURL = `http://localhost:5173/atlas?workspace=${workspace}&focus=document:${id}`
  await page.goto(atlasURL)
  await expect(page.locator('.atlas h1').first()).toHaveText('Atlas', {
    timeout: 45000
  })
  const system = page.locator('#workspace-navigation .monolith-system-link')
  const labels = await system.allTextContents()
  assert.equal(labels.filter(label => label.trim() === 'Atlas').length, 1)
  assert.equal(
    labels[labels.findIndex(label => label.trim() === 'Dashboard') + 1].trim(),
    'Atlas'
  )
  await expect(
    page.locator('.atlas-rail,.atlas-document-tabs,.atlas editor-host')
  ).toHaveCount(0)
  const inspector = page.locator('.atlas-inspector')
  await expect(inspector.locator('h2')).toHaveText(title)
  await expect(inspector.locator('.atlas-preview-text')).toContainText(
    'Canonical coherence'
  )
  const collection = page
    .locator('.atlas-collection')
    .filter({ hasText: baseTitle })
  await expect(collection).toContainText('1 items · 1 inline views')
  const other = await context.newPage()
  await other.goto(`http://localhost:5173/page/${id}?workspace=${workspace}`)
  await expect(other.locator('editor-host')).toBeVisible({ timeout: 30000 })
  const editable = other
    .locator('editor-host affine-paragraph [contenteditable="true"]')
    .first()
  await editable.click()
  await other.keyboard.press('End')
  await other.keyboard.type(' synced across views', { delay: 15 })
  await expect(
    other.getByRole('status').filter({ hasText: 'Saved to server' }).first()
  ).toBeVisible({ timeout: 20000 })
  await expect(inspector.locator('.atlas-preview-text')).toContainText(
    'synced across views',
    { timeout: 10000 }
  )
  await other.close()
  await page.bringToFront()
  const knowledge = await call('workspaceGraph/snapshot', undefined, scope)
  const database = knowledge.databases.find(item => item.id === base.id)
  assert.deepEqual(database.recordIds, [record.id])
  assert.deepEqual(database.embeddedIn, [`document:${id}`])
  await inspector
    .getByRole('button', { name: 'Open page', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/page/${id}`))
  await expect(
    page.locator('editor-host affine-paragraph').first()
  ).toContainText('synced across views', { timeout: 30000 })
  await page
    .getByRole('button', { name: 'Page settings and actions', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'View in Atlas', exact: true })
    .click()
  await expect(page).toHaveURL(/\/atlas\?/)
  await expect(page.locator('.atlas-inspector h2')).toHaveText(title)
  await page
    .locator('.atlas-collections')
    .getByRole('button', {
      name: `Explore ${baseTitle} on the map`,
      exact: true
    })
    .click()
  await expect(page.locator('.atlas-inspector h2')).toHaveText(baseTitle)
  await expect(page.locator('.atlas-inspector')).toContainText(
    'Database membership'
  )
  await expect(page.locator('.atlas-inspector')).toContainText(
    'Inline database'
  )
  await page
    .locator('.atlas-inspector')
    .getByRole('button', { name: 'Open page', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`base=${base.id}`))
  await expect(page.getByRole('table', { name: baseTitle })).toBeVisible({
    timeout: 30000
  })
  await page
    .getByRole('link', { name: `Shared record ${suffix}`, exact: true })
    .click()
  await expect(page.locator('.database-record-surface')).toBeVisible()
  await page.goto(atlasURL)
  await expect(page.locator('.atlas-inspector h2')).toHaveText(title, {
    timeout: 30000
  })
  await page.screenshot({
    path: `.temp/integrated-atlas-${engine}-desktop.png`
  })
  for (const width of [3440, 5120, 900, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForTimeout(250)
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2
      ),
      `Viewport overflow at ${width}`
    )
  }
  await page.screenshot({ path: `.temp/integrated-atlas-${engine}-mobile.png` })
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      engine,
      passed: true,
      checks: [
        'Atlas directly below Dashboard',
        'one app shell',
        'canonical save synchronized across windows',
        'inline database membership',
        'normal page and record editors',
        'View in Atlas navigation',
        '390–5120px responsive layout'
      ]
    })
  )
} catch (error) {
  await page
    .screenshot({ path: `.temp/integrated-atlas-${engine}-failure.png` })
    .catch(() => {})
  writeFileSync(
    `.temp/integrated-atlas-${engine}-failure.txt`,
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
