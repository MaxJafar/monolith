import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium } from '@playwright/test'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import postgres from 'postgres'

// Only temporary identities in the isolated local database are modified.
dotenv.config({ path: 'env/.env.local', quiet: true })
const database = new URL(process.env.DATABASE_ADMIN_URL)
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.port === '55432' &&
    database.pathname === '/zillion_dev'
)
const admin = postgres(database.toString(), { max: 1, onnotice: () => {} })
const owner = randomUUID(),
  password = randomUUID() + '!'
const email = `appearance-${owner}@example.invalid`
const api = 'http://localhost:3636',
  web = 'http://localhost:5173'
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
const browser = await chromium.launch({ headless: true })
mkdirSync('.temp/appearance', { recursive: true })
let context, page, uploadedKey
try {
  await admin`insert into users(id,email,username,name,verified,auth_password_hash) values(${owner},${email},${owner},'Synthetic appearance preview',true,${await hash(password, 4)})`
  context = await browser.newContext({
    viewport: { width: 1440, height: 1100 }
  })
  const login = await context.request.post(`${api}/auth/login`, {
    data: { email, password }
  })
  assert.equal(login.status(), 200, 'Synthetic login failed')
  const token = (await login.json()).data.accessToken
  const headers = { Authorization: `Bearer ${token}` }
  async function request(name, body, query = {}) {
    const params = new URLSearchParams(query)
    const response = await context.request[body === undefined ? 'get' : 'post'](
      `${api}/modules/${remote}/workspaces/${name}?${params}`,
      { headers, ...(body === undefined ? {} : { data: body }) }
    )
    assert.ok(
      response.ok(),
      `${name}: ${response.status()} ${await response.text()}`
    )
    return (await response.json()).data
  }
  const workspace = await request('create', {
    name: 'Appearance preview',
    enabled_modules: ['wallet']
  })
  const second = await request('create', {
    name: 'Independent workspace',
    enabled_modules: []
  })
  const document = await request(
    'createPage',
    { title: 'A workspace of your own' },
    { workspace_id: workspace.id }
  )
  page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(20000)
  await page.goto(`${web}/page/${document.id}?workspace=${workspace.id}`)
  await page
    .locator('.monolith-page-bar')
    .getByRole('button', { name: 'Customize', exact: true })
    .click()
  const builder = page.getByRole('dialog', { name: 'Appearance builder' })
  await builder.getByRole('button', { name: 'Rose', exact: true }).click()
  await builder
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .click()
  await builder
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  assert.ok(
    ['#fff', '#ffffff'].includes(
      await page
        .locator('.zillion-main-sidebar')
        .evaluate(node =>
          getComputedStyle(node)
            .getPropertyValue('--bg-primary')
            .trim()
            .toLowerCase()
        )
    ),
    'Page colors must not change the sidebar defaults'
  )
  await builder.getByRole('button', { name: 'Whole app', exact: true }).click()
  await builder.getByRole('button', { name: 'Ocean', exact: true }).click()
  await builder
    .getByLabel('Font provider', { exact: true })
    .selectOption('bunny')
  await builder.getByLabel('Font family', { exact: true }).selectOption('Lora')
  await builder
    .getByRole('button', { name: 'Save Whole app', exact: true })
    .click()
  await builder
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  await builder.getByRole('button', { name: 'Workspace', exact: true }).click()
  await builder.getByRole('button', { name: 'Sage', exact: true }).click()
  await builder
    .getByLabel('Interface icon style', { exact: true })
    .selectOption('ph-fill')
  await builder.locator('input[name="Workspace icon"]').fill('ph:star-fill')
  await builder
    .getByRole('button', { name: 'Save Workspace', exact: true })
    .click()
  await builder
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  await builder
    .getByRole('button', { name: 'This page / addon', exact: true })
    .click()
  await builder.getByRole('button', { name: 'Rose', exact: true }).click()
  await builder
    .getByLabel('Interface icon style', { exact: true })
    .selectOption('tabler')
  await builder.getByRole('button', { name: 'folder', exact: true }).click()
  await builder
    .getByRole('textbox', { name: 'Button color', exact: true })
    .fill('284e6c')
  await builder.getByLabel('Cover type', { exact: true }).selectOption('color')
  await builder
    .getByRole('textbox', { name: 'Cover color', exact: true })
    .fill('c5d7e8')
  await builder.evaluate(node => {
    for (let parent = node.parentElement; parent; parent = parent.parentElement)
      parent.scrollTop = 0
  })
  await page.screenshot({
    path: '.temp/appearance/builder-desktop.png',
    animations: 'disabled'
  })
  await builder
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .click()
  await builder
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  await builder.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.locator('.appearance-cover').waitFor()
  assert.equal(
    await page
      .locator('.appearance-page')
      .evaluate(node =>
        getComputedStyle(node).getPropertyValue('--bg-primary').trim()
      ),
    '#fff5f4'
  )
  assert.equal(
    await page
      .locator('.appearance-page')
      .evaluate(node =>
        getComputedStyle(node)
          .getPropertyValue('--interactive-primary')
          .trim()
          .toLowerCase()
      ),
    '#284e6c'
  )
  const navigation = await request('navigation', undefined, {
    workspace_id: workspace.id
  })
  assert.equal(
    navigation.pageAppearance[`/page/${document.id}`].icon,
    'tabler:folder'
  )
  assert.equal(navigation.appearance.icon, 'ph:star-fill')
  assert.equal(
    (await request('navigation', undefined, { workspace_id: second.id }))
      .appearance,
    undefined
  )
  await page.screenshot({
    path: '.temp/appearance/page-desktop.png',
    animations: 'disabled'
  })

  await page
    .locator('.monolith-page-bar')
    .getByRole('button', { name: 'Customize', exact: true })
    .click()
  const reopened = page.getByRole('dialog', { name: 'Appearance builder' })
  await reopened.waitFor()
  assert.equal(
    await reopened.evaluate(node =>
      getComputedStyle(node)
        .getPropertyValue('--interactive-primary')
        .trim()
        .toLowerCase()
    ),
    '#284e6c',
    'Modal must inherit page button colors'
  )
  await reopened.getByLabel('Cover type', { exact: true }).selectOption('image')
  await reopened.locator('input[type="file"]').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lmioAAAAASUVORK5CYII=',
      'base64'
    )
  })
  await reopened
    .getByRole('status')
    .filter({ hasText: 'Unsaved appearance changes' })
    .waitFor()
  await reopened
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .waitFor()
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('button')).some(
      button =>
        button.textContent?.includes('Save This page / addon') &&
        !button.disabled
    )
  )
  await reopened
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .click()
  await reopened
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  await reopened.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.locator('.appearance-cover-image').waitFor()
  await page.waitForFunction(() => {
    const image = document.querySelector('.appearance-cover-image')
    return (
      image instanceof HTMLImageElement &&
      image.complete &&
      image.naturalWidth > 0
    )
  })
  const uploaded = await request('navigation', undefined, {
    workspace_id: workspace.id
  })
  uploadedKey = uploaded.pageAppearance[`/page/${document.id}`].cover.fileKey
  assert.ok(uploadedKey)

  await page.goto(`${web}/wallet?workspace=${workspace.id}`)
  await page
    .locator('.monolith-page-bar')
    .getByRole('button', { name: 'Customize', exact: true })
    .click()
  const addonBuilder = page.getByRole('dialog', { name: 'Appearance builder' })
  await addonBuilder.getByRole('button', { name: 'Sand', exact: true }).click()
  await addonBuilder
    .locator('input[name="Page or addon icon"]')
    .fill('ph:wallet-fill')
  await addonBuilder
    .getByLabel('Cover type', { exact: true })
    .selectOption('color')
  await addonBuilder
    .getByRole('button', { name: 'Save This page / addon', exact: true })
    .click()
  await addonBuilder
    .getByRole('status')
    .filter({ hasText: 'Appearance saved' })
    .waitFor()
  await addonBuilder.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await page.locator('.appearance-cover').waitFor()
  assert.equal(
    (await request('navigation', undefined, { workspace_id: workspace.id }))
      .pageAppearance['/wallet'].icon,
    'ph:wallet-fill'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .locator('.monolith-page-bar')
    .getByRole('button', { name: 'Customize', exact: true })
    .click()
  const mobile = page.getByRole('dialog', { name: 'Appearance builder' })
  await mobile.waitFor()
  await page.screenshot({
    path: '.temp/appearance/builder-mobile.png',
    animations: 'disabled'
  })
  const bounds = await mobile.boundingBox()
  assert.ok(
    bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390,
    'Builder overflows mobile viewport'
  )
  assert.deepEqual(errors, [], 'Browser runtime errors')
  console.log(
    'Verified global/workspace/page inheritance, reload persistence, addon covers/icons, image upload and mobile layout.'
  )
} catch (error) {
  console.error('Appearance smoke failed:', error.message)
  if (page)
    await page
      .screenshot({
        path: '.temp/appearance/failure.png',
        animations: 'disabled'
      })
      .catch(() => {})
  throw error
} finally {
  if (uploadedKey) {
    const { createProvider } =
      await import('../packages/file-storage/dist/index.js')
    await createProvider().delete(uploadedKey)
    await admin`delete from files where key=${uploadedKey}`
  }
  await context?.close()
  await browser.close()
  await admin`delete from zillion_databases__workspaces where owner_id=${owner}`
  await admin`delete from auth__refresh_tokens where user_id=${owner}`
  await admin`delete from users where id=${owner}`
  await admin.end()
}
