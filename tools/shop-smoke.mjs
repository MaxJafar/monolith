import { chromium, expect } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = process.cwd(),
  require = createRequire(resolve(root, 'apps/api/package.json'))
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const url = new URL(process.env.DATABASE_ADMIN_URL)
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(url.pathname)
)
  throw Error('Use the isolated local development database')
const db = require('postgres')(url.href, { max: 1 })
const owner = randomUUID(),
  viewer = randomUUID(),
  workspace = randomUUID(),
  password = randomUUID() + '!Aa1'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light'
})
const page = await context.newPage(),
  errors = []
page.setDefaultNavigationTimeout(120000)
page.on('pageerror', error => errors.push(error.message))
const base = process.env.MONOLITH_WEB_URL || 'http://localhost:5187'
const api = process.env.MONOLITH_API_URL || 'http://localhost:3638'
const output = resolve(root, '.temp/shop-acceptance'),
  assets = resolve(root, 'docs/assets')
mkdirSync(output, { recursive: true })
mkdirSync(assets, { recursive: true })
try {
  for (const id of [owner, viewer])
    await db`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Monolith Studio',${await hash(password, 10)})`
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Studio','collaborative','["automations","pomodoro-timer","flashcards","achievements","code-time"]'::jsonb,true)`
  await db`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${viewer},'viewer')`
  const login = await context.request.post(api + '/auth/login', {
    data: { email: owner + '@example.invalid', password }
  })
  expect(login.status()).toBe(200)
  await page.goto(base + '/addons?workspace=' + workspace, {
    waitUntil: 'domcontentloaded'
  })
  await expect(page.locator('.addon-manager h1')).toHaveText(
    'Addons and Widgets',
    { timeout: 90000 }
  )
  await expect(page.locator('[data-addon="atlas"]')).toBeVisible({
    timeout: 30000
  })
  expect(await page.locator('.monolith-system-row').count()).toBe(7)
  expect(
    await page
      .locator('.monolith-system-row')
      .innerText()
      .catch(() => '')
  ).not.toContain('Atlas')
  await page.screenshot({ path: resolve(assets, 'addons-shop.png') })
  const search = page.getByRole('textbox', {
    name: 'Search addons and widgets…'
  })
  await search.fill('Atlas')
  await expect(page.locator('.shop-card')).toHaveCount(1)
  const toggle = page.getByRole('switch', { name: 'Enable Atlas' })
  await toggle.click()
  await expect(toggle).toBeChecked()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Enable Atlas' })).toBeChecked({
    timeout: 30000
  })
  await page.getByRole('button', { name: 'Widgets', exact: true }).click()
  for (const id of [
    'achievements',
    'code-time',
    'flashcards',
    'pomodoro-timer'
  ])
    await expect(page.locator(`[data-addon="${id}"]`)).toBeVisible()
  await page.screenshot({ path: resolve(assets, 'dashboard-widgets.png') })
  await page
    .locator('[data-addon="pomodoro-timer"]')
    .getByRole('button', { name: 'Preview & configure' })
    .click()
  await expect(
    page.getByText('Live widget preview', { exact: true })
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
  await expect(page.getByText(/Something went wrong/)).toHaveCount(0)
  await page.screenshot({ path: resolve(output, 'pomodoro-overlay.png') })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Sidebar', exact: true }).click()
  await expect(page.locator('[data-widget="calendarWidget"]')).toBeVisible()
  await page
    .locator('[data-widget="calendarWidget"]')
    .getByRole('button', { name: 'Preview & configure' })
    .click()
  await expect(
    page.getByText('Live widget preview', { exact: true })
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: resolve(assets, 'widget-settings.png') })
  await page
    .getByRole('button', { name: 'Pin to sidebar', exact: true })
    .click()
  await expect(page.locator('.monolith-sidebar-widget')).toHaveCount(1)
  await page
    .getByRole('button', { name: 'Reorder Calendar', exact: true })
    .press('ArrowDown')
  await expect(
    page.locator('.monolith-system-row .monolith-system-link').first()
  ).toHaveText('Projects')
  await page.reload()
  await expect(
    page.locator('.monolith-system-row .monolith-system-link').first()
  ).toHaveText('Projects', { timeout: 30000 })
  await page
    .getByRole('button', { name: 'Reorder Projects', exact: true })
    .dragTo(
      page.locator('.monolith-system-row').filter({ hasText: 'Calendar' })
    )
  await expect(
    page.locator('.monolith-system-row .monolith-system-link').first()
  ).toHaveText('Calendar')
  await page.getByRole('button', { name: 'Sidebar', exact: true }).click()
  await page
    .locator('[data-widget="calendarWidget"]')
    .getByRole('button', { name: 'Preview & configure' })
    .click()
  await page
    .getByRole('button', { name: 'Add to dashboard', exact: true })
    .click()
  await expect(page).toHaveURL(/\/dashboard\?workspace=/)
  await expect(page.locator('.monolith-widget-grid')).toBeVisible({
    timeout: 30000
  })
  await expect(
    page.locator('.monolith-widget-heading').filter({ hasText: /^Calendar$/ })
  ).toHaveCount(1)
  await expect(page.getByText('Unsaved changes', { exact: true })).toHaveCount(
    0,
    { timeout: 15000 }
  )
  await page.reload()
  await expect(
    page.locator('.monolith-widget-heading').filter({ hasText: /^Calendar$/ })
  ).toHaveCount(1, { timeout: 30000 })
  await page.screenshot({ path: resolve(output, 'dashboard.png') })
  await page.goto(base + '/addons?workspace=' + workspace)
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: resolve(output, 'dark.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    )
  ).toBe(true)
  const reader = await browser.newContext()
  const readerLogin = await reader.request.post(api + '/auth/login', {
    data: { email: viewer + '@example.invalid', password }
  })
  const readerToken = (await readerLogin.json()).data.accessToken
  const readPage = await reader.newPage()
  await readPage.goto(base + '/addons?workspace=' + workspace)
  await expect(
    readPage.getByRole('switch', { name: 'Enable Atlas' })
  ).toBeDisabled({ timeout: 30000 })
  const denied = await reader.request.post(api + '/modules/shop/install', {
    headers: { Authorization: `Bearer ${readerToken}` },
    data: { id: 'monolith--atlas' }
  })
  expect(denied.status()).toBe(403)
  expect(errors).toEqual([])
  console.info(
    'Shop browser checks passed: filters, workspace enablement, widget overlays, pinning, dashboard placement, native drag and keyboard ordering, reload persistence, mobile, dark mode and viewer restrictions.'
  )
} catch (error) {
  console.info('Browser errors:', errors)
  await page.screenshot({
    path: resolve(output, 'failure.png'),
    fullPage: true
  })
  throw error
} finally {
  await browser.close()
  await db`delete from users where id in (${owner},${viewer})`
  await db.end()
}
