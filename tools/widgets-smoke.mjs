import { resolveAddonIdentity } from '@monolith/configs/node'
// Acceptance tests create only synthetic workspaces under the local fixture account.
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const canonical = process.argv.includes('--canonical')
const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const name = `${engine}-${canonical ? 'canonical' : 'classic'}`
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1060 }
})
const remoteIcons = []
context.on('request', request => {
  if (
    ['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(
      new URL(request.url()).hostname
    )
  )
    remoteIcons.push(request.url())
})
const api = 'http://localhost:3636'
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
let page
try {
  if (canonical) {
    const discovery = await context.request.get(
      'http://localhost:5173/.well-known/monolith'
    )
    assert.ok(
      discovery.ok(),
      'Start the Go gateway before canonical acceptance'
    )
    assert.equal(
      (await discovery.json()).publicUrl,
      'http://localhost:5173',
      'The local browser must proxy a gateway configured with PUBLIC_URL=http://localhost:5173. Set MONOLITH_GATEWAY_DEV_URL when using a separate development gateway.'
    )
  }
  const login = await context.request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  async function request(route, data, query = {}) {
    const response = await context.request.fetch(
      `${api}/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    assert.ok(
      response.ok(),
      `${route}: ${response.status()} ${await response.text()}`
    )
    return (await response.json()).data
  }
  const workspace = await request('workspaces/create', {
    name: `Widget studio · ${name}`,
    profile: 'personal',
    icon: 'lucide:panels-top-left',
    enabled_modules: ['databases', 'gym', 'tech-lab', 'todo-list', 'projects'],
    description: 'Synthetic interaction review'
  })
  const scope = { workspace_id: workspace.id }
  const block = (type, title, extra = {}) => ({
    id: randomUUID(),
    type,
    title,
    width: 'full',
    content: '',
    widget: '',
    url: '',
    ...extra
  })
  const layout = (title, blocks) => ({
    version: 1,
    title,
    icon: 'lucide:house',
    fullWidth: true,
    revision: 0,
    updated: null,
    blocks
  })
  await request(
    'workspaces/saveAreaPage',
    {
      expected_revision: 0,
      page: layout('Dashboard', [
        block('document', 'Workspace intention', {
          content: 'Make room for meaningful work.'
        })
      ])
    },
    { ...scope, key: '/dashboard' }
  )
  await request(
    'workspaces/saveAreaPage',
    { expected_revision: 0, page: layout('Gym', [block('native', 'Gym')]) },
    { ...scope, key: '/gym' }
  )
  const base = await request(
    'workspaceDatabases/createBase',
    {
      name: 'Studio work',
      description: '',
      initial_view: 'table',
      view_name: 'All work'
    },
    scope
  )
  const day = new Date()
  day.setHours(12, 0, 0, 0)
  for (const [title, type, done, offset] of [
    ['Shape the next chapter', 'task', false, 0],
    ['Review the design system', 'task', false, 0],
    ['Plan the next release', 'task', false, 2],
    ['Establish a calmer workspace', 'task', true, 0],
    ['Monolith workspace', 'project', false, 0],
    ['A thoughtful onboarding', 'project', false, 0]
  ]) {
    const date = new Date(day)
    date.setDate(date.getDate() + offset)
    await request(
      'workspaceDatabases/createRecord',
      {
        base_id: base.id,
        title,
        content: '',
        values: {},
        item_type: type,
        done,
        date: date.toISOString()
      },
      scope
    )
  }
  if (canonical) {
    for (const id of [fixture.owner, workspace.id])
      assert.match(id, /^[a-f0-9-]{36}$/)
    const migrated = spawnSync(
      'pnpm',
      [
        'gateway:migrate',
        '--actor',
        fixture.owner,
        '--workspace',
        workspace.id,
        '--apply'
      ],
      {
        shell: process.platform === 'win32',
        encoding: 'utf8',
        windowsHide: true,
        env: { ...process.env, PUBLIC_URL: 'http://localhost:5173' }
      }
    )
    assert.equal(migrated.status, 0, migrated.stderr || migrated.stdout)
  }
  page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://localhost:5173/dashboard?workspace=${workspace.id}`)
  const board = page.locator('.monolith-widget-workspace')
  await expect(board).toBeVisible({ timeout: 30_000 })
  assert.ok(
    await page.evaluate(
      async () => (await document.fonts.load('500 14px Inter')).length > 0
    ),
    'The shared Inter font must load locally'
  )
  const originalCount = await board
    .locator('.monolith-widget-grid > [data-widget-id]')
    .count()
  await board.getByRole('button', { name: 'Templates', exact: true }).click()
  await board.getByRole('button', { name: /Daily focus/ }).click()
  await expect(
    board.locator('.monolith-widget-grid > [data-widget-id]')
  ).toHaveCount(originalCount + 5)
  await expect(
    board.getByText('Make room for meaningful work.', { exact: true })
  ).toBeVisible()
  const agenda = board.locator('[data-widget-id]').filter({
    has: page
      .locator('.monolith-widget-heading')
      .getByText('Action agenda', { exact: true })
  })
  await expect(
    agenda.getByRole('link', { name: /^Shape the next chapter/ })
  ).toBeVisible()
  await agenda.getByRole('button', { name: 'Upcoming', exact: true }).click()
  await expect(
    agenda.getByRole('link', { name: /^Plan the next release/ })
  ).toBeVisible()
  await agenda.getByRole('button', { name: 'Today', exact: true }).click()
  const completedTitle = await agenda
    .getByRole('checkbox')
    .first()
    .getAttribute('aria-label')
  await agenda.getByRole('checkbox').first().click()
  await expect(
    agenda.getByRole('checkbox', { name: completedTitle, exact: true })
  ).toHaveCount(0)
  const order = () =>
    board
      .locator('.monolith-widget-grid > .monolith-widget-tile')
      .evaluateAll(nodes => nodes.map(node => node.dataset.widgetId))
  const initial = await order()
  const first = board
    .locator('.monolith-widget-grid > .monolith-widget-tile')
    .first()
  await first.getByRole('button', { name: /^Move / }).press('ArrowDown')
  assert.equal((await order())[1], initial[0])
  await board
    .getByRole('button', { name: 'Undo layout change', exact: true })
    .click()
  assert.deepEqual(await order(), initial)
  const handle = first.getByRole('button', { name: /^Move / })
  await handle.scrollIntoViewIfNeeded()
  const a = await handle.boundingBox(),
    b = await board
      .locator('.monolith-widget-grid > .monolith-widget-tile')
      .nth(2)
      .boundingBox()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + 50, { steps: 12 })
  await expect(page.locator('.monolith-widget-ghost')).toBeVisible()
  await page.mouse.up()
  assert.notDeepEqual(await order(), initial)
  await expect(page.locator('.monolith-widget-ghost')).toHaveCount(0)
  await board
    .getByRole('button', { name: 'Undo layout change', exact: true })
    .click()
  const resize = first.getByRole('button', { name: /^Resize / })
  await resize.click()
  await expect(resize).toBeFocused()
  await page.keyboard.press('ArrowDown')
  const height = await first.evaluate(node => node.style.height)
  assert.ok(parseFloat(height) >= 180)
  await resize.scrollIntoViewIfNeeded()
  const r = await resize.boundingBox()
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
  await page.mouse.down()
  await page.mouse.move(r.x - 130, r.y + 80, { steps: 8 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  assert.equal(await first.evaluate(node => node.style.height), height)
  await expect(page.locator('[data-gesture]')).toHaveCount(0)
  await resize.press('ArrowLeft')
  await expect(first).toHaveAttribute('data-width', 'half')
  const ids = await order()
  async function saved() {
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /^(Saved|All changes saved|Saved to server)$/ })
    ).toBeVisible({ timeout: 15_000 })
  }
  await saved()
  await page.reload()
  await expect(board).toBeVisible({ timeout: 30_000 })
  assert.deepEqual(await order(), ids)
  await expect(first).toHaveAttribute('data-width', 'half')
  assert.equal(await first.evaluate(node => node.style.height), height)
  // Provider failures are deterministic; persistence still uses the real API.
  let cityRequests = 0,
    forecastRequests = 0
  await page.route('https://geocoding-api.open-meteo.com/**', route =>
    route.fulfill({
      status: ++cityRequests === 1 ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            name: 'Baku',
            country: 'Azerbaijan',
            latitude: 40.4093,
            longitude: 49.8671
          }
        ]
      })
    })
  )
  await page.route('https://api.open-meteo.com/**', route =>
    route.fulfill({
      status: ++forecastRequests === 1 ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          temperature_2m: 23,
          weather_code: 1,
          wind_speed_10m: 12,
          time: '2026-10-14T12:00'
        }
      })
    })
  )
  const weather = board
    .locator('.monolith-widget-grid > [data-widget-id]')
    .filter({ has: page.getByRole('textbox', { name: 'City', exact: true }) })
  await weather.getByRole('textbox', { name: 'City', exact: true }).fill('Baku')
  await weather.getByRole('button', { name: 'Find city', exact: true }).click()
  await expect(weather.getByRole('alert')).toBeVisible()
  await weather.getByRole('button', { name: 'Find city', exact: true }).click()
  await weather
    .getByRole('button', { name: 'Baku, Azerbaijan', exact: true })
    .click()
  const outside = board
    .locator('.monolith-widget-grid > [data-widget-id]')
    .filter({ has: page.getByText('Baku, Azerbaijan', { exact: true }) })
  await expect(outside.getByRole('alert')).toBeVisible()
  await outside.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(outside.getByText('23°', { exact: true })).toBeVisible()
  await saved()
  await page.reload()
  await expect(outside.getByText('23°', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  assert.ok(cityRequests >= 2 && forecastRequests >= 3)
  await page
    .locator('input[aria-label="Page title"], h1')
    .first()
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/assets/monolith-widgets-${name}.png`,
    animations: 'disabled'
  })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    'Mobile layout overflows'
  )
  assert.equal(
    await first.evaluate(node => getComputedStyle(node).gridColumnStart),
    'span 12'
  )
  await page.screenshot({
    path: `docs/assets/monolith-widgets-${name}-mobile.png`,
    animations: 'disabled'
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await board.getByRole('button', { name: 'Add widget', exact: true }).click()
  assert.equal(
    await board
      .locator('.monolith-widget-library')
      .evaluate(node => getComputedStyle(node).animationName),
    'none'
  )
  await board.getByRole('button', { name: 'Close', exact: true }).click()
  await page.setViewportSize({ width: 1440, height: 1060 })
  await page.goto(`http://localhost:5173/gym?workspace=${workspace.id}`)
  await board.getByRole('button', { name: 'Add widget', exact: true }).click()
  const library = board.getByRole('region', {
    name: 'Widget library',
    exact: true
  })
  await expect(
    library.getByRole('button', { name: 'Action agenda', exact: true })
  ).toHaveCount(0)
  await expect(
    library.getByRole('button', { name: 'Training pulse', exact: true })
  ).toBeVisible()
  await library
    .getByRole('button', { name: 'Training pulse', exact: true })
    .click()
  await expect(
    board.locator('.monolith-widget-grid > .monolith-widget-tile')
  ).toHaveCount(2)
  await saved()
  await page.reload()
  await expect(
    board.locator('.monolith-widget-grid > .monolith-widget-tile')
  ).toHaveCount(2)
  assert.deepEqual(errors, [], 'Uncaught page errors')
  assert.deepEqual(
    remoteIcons,
    [],
    'Shipped interface icons must render locally'
  )
  writeFileSync(
    `.temp/widgets-${name}.json`,
    JSON.stringify({
      workspace: workspace.id,
      url: `http://localhost:5173/dashboard?workspace=${workspace.id}`
    })
  )
  console.log(
    `PASS ${name}: templates, retained content, live Actions, keyboard and pointer reorder, resize/cancel, undo, persistence, weather setup/retry, mobile, reduced motion, addon scoping.`
  )
} catch (error) {
  if (page) {
    await page
      .screenshot({
        path: `.temp/widgets-failure-${name}.png`,
        animations: 'disabled'
      })
      .catch(() => {})
    writeFileSync(
      `.temp/widgets-failure-${name}.txt`,
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    )
  }
  throw error
} finally {
  await browser.close()
}
