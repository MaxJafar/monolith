import { chromium, expect } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
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
  throw Error('Use the isolated development database')
const { owner } = JSON.parse(readFileSync('.temp/update-fixture.json', 'utf8'))
const viewer = randomUUID(),
  workspace = randomUUID(),
  password = randomUUID() + '!Aa1'
const db = require('postgres')(url.href, { max: 1 })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light'
})
const page = await context.newPage(),
  errors = []
page.on('pageerror', error => errors.push(error.message))
page.setDefaultTimeout(30000)
page.setDefaultNavigationTimeout(120000)
const api = 'http://localhost:3638',
  base = 'http://localhost:5187',
  output = resolve('.temp/update-acceptance')
mkdirSync(output, { recursive: true })
try {
  for (const id of [owner, viewer])
    await db`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Monolith Update Test',${await hash(password, 10)})`
  await db`insert into zillion_databases__workspaces(id,owner_id,name,profile,enabled_modules,is_default) values(${workspace},${owner},'Update Studio','collaborative','[]'::jsonb,true)`
  await db`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${viewer},'viewer')`
  const login = await context.request.post(api + '/auth/login', {
    data: { email: owner + '@example.invalid', password }
  })
  expect(login.status()).toBe(200)
  const accessToken = (await login.json()).data.accessToken
  const auth = { Authorization: `Bearer ${accessToken}` }
  const status = await context.request.get(api + '/updates/status', {
    headers: auth
  })
  expect(status.status()).toBe(200)
  expect((await status.json()).data.canManage).toBe(true)
  const health = await context.request.get(api + '/status')
  expect((await health.json()).data).toMatchObject({
    version: '0.0.0',
    healthy: true
  })
  const check = await context.request.post(api + '/updates/action', {
    headers: auth,
    data: { action: 'check' }
  })
  expect(check.status()).toBe(200)
  await page.goto(base + '/dashboard?workspace=' + workspace, {
    waitUntil: 'domcontentloaded'
  })
  await expect(page.locator('.monolith-update-notice')).toBeVisible({
    timeout: 90000
  })
  await page
    .locator('.monolith-update-notice')
    .getByRole('button', { name: 'Review', exact: true })
    .click()
  const dialog = page.locator('.monolith-updates-dialog[open]')
  await expect(
    dialog.getByRole('heading', { name: 'Hosted server' })
  ).toBeVisible()
  await expect(dialog.getByText('An update is available')).toBeVisible()
  await dialog.getByText('Release notes', { exact: true }).click()
  await expect(dialog.getByText(/Improved workspace updates/)).toBeVisible()
  const automatic = dialog.getByRole('switch', {
    name: 'Hosted server: Install updates automatically'
  })
  await automatic.click()
  await expect(automatic).toBeChecked()
  await expect(
    dialog.getByRole('switch', {
      name: 'Hosted server: Download updates automatically'
    })
  ).toBeChecked()
  await dialog.getByLabel('Maintenance window').selectOption('5')
  await expect(dialog.getByLabel('Maintenance window')).toHaveValue('5')
  await automatic.click()
  await expect(automatic).not.toBeChecked()
  await dialog
    .getByRole('button', { name: 'Download update', exact: true })
    .click()
  await expect(dialog.getByRole('progressbar')).toBeVisible()
  await expect(dialog.getByText(/% ·/)).toBeVisible()
  await expect
    .poll(async () =>
      Number(await dialog.getByRole('progressbar').getAttribute('value'))
    )
    .toBeGreaterThan(0)
  await page.screenshot({ path: resolve(output, 'downloading.png') })
  await expect(dialog.getByText(/Ready to install/)).toBeVisible({
    timeout: 30000
  })
  await dialog.getByRole('button', { name: 'Install server update' }).click()
  await expect(
    dialog.getByText(/The candidate failed its health check/)
  ).toBeVisible()
  await expect(dialog.getByText('Installed version 0.0.0')).toBeVisible()
  await page.screenshot({ path: resolve(output, 'rollback.png') })
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: resolve(output, 'dark.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2
    )
  ).toBe(true)
  await page.screenshot({ path: resolve(output, 'mobile.png') })
  const reader = await browser.newContext()
  const readLogin = await reader.request.post(api + '/auth/login', {
    data: { email: viewer + '@example.invalid', password }
  })
  const readerAuth = {
    Authorization: `Bearer ${(await readLogin.json()).data.accessToken}`
  }
  const readerStatus = await reader.request.get(api + '/updates/status', {
    headers: readerAuth
  })
  expect((await readerStatus.json()).data.canManage).toBe(false)
  for (const action of ['check', 'download', 'install', 'rollback']) {
    const denied = await reader.request.post(api + '/updates/action', {
      headers: readerAuth,
      data: { action }
    })
    expect(denied.status()).toBe(403)
  }
  expect(
    (
      await reader.request.post(api + '/updates/settings', {
        headers: readerAuth,
        data: {
          channel: 'stable',
          autoDownload: true,
          autoInstall: true,
          installHourUTC: 3
        }
      })
    ).status()
  ).toBe(403)
  const anonymous = await browser.newContext()
  expect((await anonymous.request.get(api + '/updates/status')).status()).toBe(
    401
  )
  expect(errors).toEqual([])
  console.info(
    'Update acceptance passed: API health, admin permissions, notifications, settings persistence, byte progress, failed-install recovery state, dark/mobile/reduced-motion UI.'
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
