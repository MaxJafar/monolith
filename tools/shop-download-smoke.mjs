import { chromium, expect } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = process.cwd(),
  require = createRequire(resolve(root, 'apps/api/package.json'))
dotenv.config({ path: resolve(root, 'env/.env.local'), quiet: true })
const url = new URL(process.env.DATABASE_ADMIN_URL)
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(url.pathname)
)
  throw Error('Local fixture database required')
const { owner } = JSON.parse(
  await fs.readFile('.temp/shop-download-fixture.json', 'utf8')
)
const db = require('postgres')(url.href, { max: 1 }),
  workspace = randomUUID(),
  password = randomUUID() + '!Aa1'
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  }),
  page = await context.newPage(),
  errors = []
page.on('pageerror', error => errors.push(error.message))
page.setDefaultNavigationTimeout(120000)
let created = false
try {
  await db`insert into users(id,email,username,name,auth_password_hash) values(${owner},${owner + '@example.invalid'},${owner},'Release preview',${await hash(password, 10)})`
  created = true
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Studio','collaborative','[]'::jsonb,true)`
  const login = await context.request.post('http://localhost:3639/auth/login', {
    data: { email: owner + '@example.invalid', password }
  })
  expect(login.status()).toBe(200)
  // Route only this browser fixture to the isolated core-only API.
  await context.route('http://localhost:3638/**', route =>
    route.continue({
      url: route.request().url().replace('localhost:3638', 'localhost:3639')
    })
  )
  await page.goto('http://localhost:5187/addons?workspace=' + workspace, {
    waitUntil: 'domcontentloaded'
  })
  const atlas = page.locator('[data-addon="atlas"]')
  await expect(
    atlas.getByRole('button', { name: 'Download', exact: true })
  ).toBeEnabled({ timeout: 90000 })
  await atlas.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(atlas.getByRole('progressbar')).toBeVisible()
  await expect(atlas.getByRole('status')).toContainText('Downloading')
  await page.screenshot({
    path: resolve(root, '.temp/shop-acceptance/download.png')
  })
  await expect(atlas.getByText('Installed — reload to apply')).toBeVisible({
    timeout: 60000
  })
  await atlas
    .getByRole('button', { name: 'Reload to use this version' })
    .click()
  await expect(page.getByRole('switch', { name: 'Enable Atlas' })).toBeVisible({
    timeout: 60000
  })
  await page.getByRole('switch', { name: 'Enable Atlas' }).click()
  await expect(page.getByRole('switch', { name: 'Enable Atlas' })).toBeChecked()
  await page
    .locator('[data-addon="atlas"]')
    .getByRole('link', { name: 'Open', exact: true })
    .click()
  await expect(page.locator('.atlas-workbench, .atlas')).toBeVisible({
    timeout: 60000
  })
  expect(errors).toEqual([])
  await page.screenshot({
    path: resolve(root, '.temp/shop-acceptance/installed-atlas.png')
  })
  console.info(
    'Download flow passed: core-only host, real package bytes, progress, activation, reload, workspace enablement and downloaded Atlas rendering. GitHub transport was an isolated local fixture.'
  )
} catch (error) {
  console.info('Browser errors:', errors)
  await page.screenshot({
    path: resolve(root, '.temp/shop-acceptance/download-failure.png')
  })
  throw error
} finally {
  await browser.close()
  if (created) await db`delete from users where id=${owner}`
  await db.end()
}
