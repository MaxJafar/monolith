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
const db = require('postgres')(url.href, { max: 1 }),
  owner = randomUUID(),
  viewer = randomUUID(),
  workspace = randomUUID(),
  other = randomUUID(),
  password = randomUUID() + '!Aa1'
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1080 }
  }),
  page = await context.newPage()
const output = resolve(root, '.temp/monolith-catalog-acceptance')
mkdirSync(output, { recursive: true })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const base = process.env.MONOLITH_WEB_URL || 'http://localhost:5173'
try {
  for (const id of [owner, viewer])
    await db`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Catalog review',${await hash(password, 10)})`
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Studio','collaborative','["automations"]'::jsonb,true),(${other},${owner},'Personal','personal','[]'::jsonb,false)`
  await db`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${viewer},'viewer')`
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: owner + '@example.invalid', password }
  })
  if (login.status() !== 200) throw Error('Fixture login failed')
  await page.goto(base + '/addons?workspace=' + workspace)
  await expect(page.locator('.addon-manager h1')).toHaveText('Addons', {
    timeout: 60000
  })
  await expect(page.locator('.addon-card').first()).toBeVisible()
  expect(await page.locator('.addon-card').count()).toBeGreaterThan(10)
  expect(await page.locator('.addon-manager').innerText()).not.toMatch(
    /lifeforge|melvinchia|melvin chia/i
  )
  expect(
    await page
      .locator('.addon-manager a')
      .evaluateAll(links => links.map(link => link.href).join(' '))
  ).not.toMatch(/lifeforge|melvinchia/i)
  await page.screenshot({ path: resolve(output, 'desktop.png') })
  const search = page.getByRole('textbox', { name: 'Search addons…' })
  await search.fill('  automations  ')
  await expect(page.locator('.addon-card')).toHaveCount(1)
  const toggle = page.getByRole('switch', { name: 'Enable Automations' })
  await expect(toggle).toBeChecked()
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await toggle.press('Space')
  await expect(toggle).toBeChecked()
  await page.reload()
  await expect(
    page.getByRole('switch', { name: 'Enable Automations' })
  ).toBeChecked({ timeout: 20000 })
  await page
    .getByRole('combobox', { name: 'Addon type' })
    .selectOption('widget')
  await expect(page.locator('[data-addon="achievements"]')).toBeVisible()
  await expect(page.locator('[data-addon="automations"]')).toHaveCount(0)
  await search.fill('no-such-addon-123')
  await expect(page.getByText('No addons match your filters')).toBeVisible()
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: /^Enabled/ }).click()
  await expect(page.locator('.addon-card')).toHaveCount(1)
  await page.goto(base + '/addons?workspace=' + other)
  await expect(
    page.getByRole('switch', { name: 'Enable Automations' })
  ).not.toBeChecked({ timeout: 20000 })
  await page.route('**/workspaces/update*', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ state: 'error', message: 'Test save failure' })
    })
  )
  await page.getByRole('switch', { name: 'Enable Automations' }).click()
  await expect(page.locator('.addon-manager [role="alert"]')).toBeVisible()
  await expect(
    page.getByRole('switch', { name: 'Enable Automations' })
  ).not.toBeChecked()
  await page.unroute('**/workspaces/update*')
  await page.reload()
  await expect(page.locator('.addon-card').first()).toBeVisible()
  await search.fill('Automations')
  await search.blur()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('body')).toHaveClass(/dark/)
  await expect(page.locator('.addon-filter-select').first()).toHaveCSS(
    'background-color',
    'rgb(32, 32, 32)'
  )
  await page.screenshot({ path: resolve(output, 'dark.png') })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .getByRole('switch', { name: 'Enable Automations' })
      .evaluate(element => getComputedStyle(element).transitionDuration)
  ).toBe('0s')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true })
  await page.locator('[data-addon="automations"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(output, 'mobile-card.png') })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    )
  ).toBe(true)
  const reader = await browser.newContext({
    viewport: { width: 1440, height: 1080 }
  })
  await reader.request.post('http://localhost:3636/auth/login', {
    data: { email: viewer + '@example.invalid', password }
  })
  const readPage = await reader.newPage()
  await readPage.goto(base + '/addons?workspace=' + workspace)
  await expect(
    readPage.getByRole('switch', { name: 'Enable Automations' })
  ).toBeDisabled({ timeout: 20000 })
  expect(errors).toEqual([])
  console.log(
    'Addon catalog browser checks passed: brand, filters, switches, persistence, workspace isolation, failed-save state, viewer access, reduced motion and mobile layout.'
  )
} catch (error) {
  await page.screenshot({
    path: resolve(output, 'failure.png'),
    fullPage: true
  })
  throw error
} finally {
  await browser.close()
  await db`delete from zillion_databases__workspaces where id in (${workspace},${other}) and owner_id=${owner}`
  await db`delete from users where id in (${owner},${viewer})`
  await db.end()
}
