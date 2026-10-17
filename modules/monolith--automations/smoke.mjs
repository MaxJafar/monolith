import { chromium, expect } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url)),
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
  workspace = randomUUID(),
  password = randomUUID() + '!Aa1',
  email = owner + '@example.invalid'
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1080 }
  })
const output = resolve(root, '.temp/automations-acceptance')
mkdirSync(output, { recursive: true })
const page = await context.newPage(),
  errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', dialog => dialog.accept())
try {
  await db`insert into users(id,email,username,name,auth_password_hash) values(${owner},${email},${owner},'Automation review',${await hash(password, 10)})`
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Automations review','personal','["automations"]'::jsonb,true)`
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email, password }
  })
  if (login.status() !== 200)
    throw Error(`Fixture login failed: ${login.status()}`)
  await page.goto(
    `${process.env.MONOLITH_WEB_URL || 'http://localhost:5173'}/automations?workspace=${workspace}`
  )
  await expect(page.locator('.automations h1')).toHaveText('Automations', {
    timeout: 60000
  })
  await page.screenshot({ path: resolve(output, 'dashboard.png') })
  await page.getByRole('button', { name: 'New workflow', exact: true }).click()
  await expect(page.locator('.automation-node')).toHaveCount(3, {
    timeout: 15000
  })
  await page.getByRole('button', { name: 'Run workflow', exact: true }).click()
  await expect(page.locator('.automation-result')).toContainText('Completed', {
    timeout: 15000
  })
  await page
    .getByRole('button', { name: 'Inspect execution', exact: true })
    .click()
  await expect(page.locator('.automation-step')).toHaveCount(3)
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  const node = page
    .locator('.automation-node')
    .filter({ hasText: 'Prepare data' })
    .locator('.automation-node-title')
  await node.click()
  await node.press('ArrowDown')
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await page
    .locator('.automation-inspector textarea')
    .fill('{"message":"Verified"}')
  await page.getByRole('button', { name: 'Apply fields', exact: true }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Revision 2', { exact: true })).toBeVisible({
    timeout: 10000
  })
  await page.getByRole('button', { name: 'Run workflow', exact: true }).click()
  await expect(page.locator('.automation-result')).toContainText('Completed', {
    timeout: 15000
  })
  await page.screenshot({ path: resolve(output, 'editor.png') })
  await page
    .getByRole('button', { name: 'Inspect execution', exact: true })
    .click()
  await page.locator('.automation-step summary').last().click()
  await expect(page.locator('.automation-json').last()).toContainText(
    'Verified'
  )
  await page.reload()
  await expect(page.locator('.automation-node')).toHaveCount(3, {
    timeout: 20000
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2
  )
  if (overflow) throw Error('Mobile page overflows horizontally')
  if (errors.length) throw Error(errors.join('\n'))
  console.log(
    'Automations browser checks passed: create, run, inspect, keyboard movement, edit, save, reload, mobile.'
  )
} catch (error) {
  await page.screenshot({
    path: resolve(output, 'failure.png'),
    fullPage: true
  })
  console.log(
    await page
      .locator('.automation-inspector')
      .innerText({ timeout: 1000 })
      .catch(() => 'Editor not loaded')
  )
  console.log(errors)
  throw error
} finally {
  await browser.close()
  await db`delete from zillion_databases__workspaces where id=${workspace} and owner_id=${owner}`
  await db`delete from users where id=${owner}`
  await db.end()
}
