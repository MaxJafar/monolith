import { resolveAddonIdentity } from '@monolith/configs/node'
// Run only against the synthetic local preview account. Credentials are never logged.
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(
  readFileSync('.temp/monolith-review-fixture.json', 'utf8')
)
const origin = 'http://localhost:5173',
  api = 'http://localhost:3636'
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  })
  const login = await context.request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200, 'Synthetic preview login failed')
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  const result = await context.request.get(
    `${api}/modules/${remote}/workspaces/list`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  assert.equal(result.status(), 200)
  const spaces = (await result.json()).data
  const workspace = spaces.find(space => space.is_default) ?? spaces[0]
  assert.ok(workspace?.id)
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/dashboard?workspace=${workspace.id}`)
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  const navigation = page.getByRole('navigation', { name: 'Workspace views' })
  for (const name of [
    'Calendar',
    'Projects',
    'Actions',
    'Docs',
    'Dashboard',
    'Databases'
  ])
    await navigation.getByRole('link', { name, exact: true }).waitFor()
  const reviewGroup = page.locator('section[aria-label="Workspace review"]')
  const pagesGroup = page.locator('section[aria-label="Pages"]')
  await reviewGroup
    .getByRole('link', { name: 'Wallet', exact: true })
    .dragTo(pagesGroup.getByRole('button', { name: 'Pages', exact: true }))
  await pagesGroup.getByRole('link', { name: 'Wallet', exact: true }).waitFor()
  await pagesGroup
    .getByRole('link', { name: 'Wallet', exact: true })
    .dragTo(
      reviewGroup.getByRole('button', { name: 'Workspace review', exact: true })
    )
  await reviewGroup.getByRole('link', { name: 'Wallet', exact: true }).waitFor()
  await page.reload()
  await reviewGroup.getByRole('link', { name: 'Wallet', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await page.screenshot({
    path: '.temp/architecture-dashboard.png',
    animations: 'disabled'
  })
  await navigation.getByRole('link', { name: 'Projects', exact: true }).click()
  await page.getByRole('tab', { name: 'Gantt', exact: true }).click()
  await page
    .getByText('Projects and their linked actions.', { exact: false })
    .waitFor()
  await page.getByRole('tab', { name: 'Board', exact: true }).click()
  await page.screenshot({
    path: '.temp/architecture-projects.png',
    animations: 'disabled'
  })
  await navigation.getByRole('link', { name: 'Actions', exact: true }).click()
  await page.getByRole('tab', { name: /High priority/ }).click()
  await page
    .getByRole('button', {
      name: 'Review Monolith workspace navigation',
      exact: true
    })
    .waitFor()
  await navigation.getByRole('link', { name: 'Docs', exact: true }).click()
  await page.getByRole('tab', { name: 'Ideas', exact: true }).click()
  await navigation.getByRole('link', { name: 'Databases', exact: true }).click()
  await page.getByRole('table', { name: 'Databases', exact: true }).waitFor()
  await page.screenshot({
    path: '.temp/architecture-databases.png',
    animations: 'disabled'
  })
  await navigation.getByRole('link', { name: 'Calendar', exact: true }).click()
  await page
    .getByRole('link', { name: 'Calendars & integrations', exact: true })
    .click()
  await page.waitForURL(/\/calendar\/sources\?/)
  await page
    .getByText('Page not found', { exact: false })
    .waitFor({ state: 'hidden' })
  await page.getByRole('link', { name: 'Manage addons', exact: true }).click()
  await page.getByRole('heading', { name: 'Addons', exact: true }).waitFor()
  assert.equal(
    await page
      .getByRole('textbox', { name: 'Page title', exact: true })
      .count(),
    0,
    'Addon management must not render an editable legacy module page'
  )
  await navigation.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: 'Open page tree', exact: true })
    .waitFor()
  await page.locator('#workspace-navigation').waitFor({ state: 'hidden' })
  await page.locator('.monolith-sidebar-backdrop').waitFor({ state: 'hidden' })
  await page.screenshot({
    path: '.temp/architecture-mobile.png',
    animations: 'disabled'
  })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
    'Mobile page must not overflow horizontally'
  )
  await page
    .getByRole('button', { name: 'Open page tree', exact: true })
    .click()
  await page.waitForFunction(() =>
    document
      .getElementById('workspace-navigation')
      ?.contains(document.activeElement)
  )
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Open page tree', exact: true })
    .waitFor()
  assert.deepEqual(errors, [], 'Workspace must not emit page errors')
  console.log(
    'Workspace smoke passed: six core routes, project layouts, agenda, Ideas, database catalog, calendar integrations, addon management, mobile layout and drawer focus.'
  )
} finally {
  await browser.close()
}
