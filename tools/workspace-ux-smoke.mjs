import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 980 }
})
const login = await context.request.post('http://localhost:3636/auth/login', {
  data: { email: fixture.email, password: fixture.password }
})
assert.equal(login.status(), 200)
const token = (await login.json()).data.accessToken
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
async function request(route, data, params = {}) {
  const response = await context.request.fetch(
    `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(params)}`,
    {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Monolith-Package-Names': '1'
      },
      data
    }
  )
  assert.ok(
    response.ok(),
    `${route}: ${response.status()} ${await response.text()}`
  )
  return (await response.json()).data
}
const space = await request('workspaces/create', {
  name: `Workspace experience · ${engine}`,
  profile: 'personal',
  icon: 'lucide:layers',
  description: 'Synthetic workspace interaction acceptance',
  enabled_modules: [
    'databases',
    'blog',
    'pomodoro-timer',
    'achievements',
    'idea-box',
    'tech-lab'
  ]
})
const scope = { workspace_id: space.id }
const first = await request(
  'workspaces/createPage',
  { title: 'Launch notes', parent_id: null },
  scope
)
const child = await request(
  'workspaces/createPage',
  { title: 'Launch checklist', parent_id: first.id },
  scope
)
const second = await request(
  'workspaces/createPage',
  { title: 'Research notebook', parent_id: null },
  scope
)
const groupId = randomUUID()
await request(
  'workspaces/saveNavigation',
  {
    revision: 0,
    groups: [{ id: groupId, name: 'Design studio', icon: 'lucide:palette' }],
    items: []
  },
  scope
)
const base = await request(
  'workspaceDatabases/createBase',
  {
    name: 'Product studio',
    description: '',
    initial_view: 'kanban',
    view_name: 'Delivery board'
  },
  scope
)
const today = new Date().toISOString()
const task = await request(
  'workspaceDatabases/createRecord',
  {
    base_id: base.id,
    title: 'Launch Monolith',
    item_type: 'task',
    content: 'A thoughtful release.',
    values: {},
    tags: ['Design'],
    status: 'active',
    date: today
  },
  scope
)
const journal = await request(
  'workspaceDatabases/createRecord',
  {
    base_id: base.id,
    title: 'A day of thoughtful progress',
    item_type: 'note',
    content: 'A journal entry shared with Docs.',
    values: {},
    tags: ['journal'],
    date: today
  },
  scope
)
await request(
  'workspaceDatabases/createRecord',
  {
    base_id: base.id,
    title: 'Design review',
    item_type: 'event',
    content: '',
    values: {},
    date: today
  },
  scope
)
const snapshot = await request('workspaceDatabases/snapshot', undefined, scope)
const view = snapshot.views.find(view => view.base_id === base.id)
await request(
  'workspaceDatabases/updateView',
  {
    name: view.name,
    mode: 'kanban',
    group_field_id: null,
    config: {
      ...view.config,
      group_property: 'done',
      color: {
        by: 'status',
        palette: { active: '#518e97', planned: '#b1883e' },
        columns: true
      }
    }
  },
  { ...scope, id: view.id }
)
const page = await context.newPage()
const errors = [],
  remoteIcons = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', req => {
  if (/api\.(iconify\.design|simplesvg\.com|unisvg\.com)/.test(req.url()))
    remoteIcons.push(req.url())
})
try {
  await page.goto(`http://localhost:5173/dashboard?workspace=${space.id}`)
  const sidebar = page.locator('#workspace-navigation')
  await expect(
    sidebar.getByRole('link', { name: 'Launch notes', exact: true })
  ).toBeVisible({ timeout: 45000 })
  await expect(
    sidebar.getByRole('link', { name: 'Pomodoro Timer', exact: true })
  ).toHaveCount(0)
  const resize = page.getByRole('separator', { name: 'Resize sidebar' })
  await expect(resize).toHaveAttribute('aria-valuenow', '264')
  await resize.focus()
  await page.keyboard.press('ArrowRight')
  await expect(resize).toHaveAttribute('aria-valuenow', '272')
  await resize.hover()
  let rect = await resize.boundingBox()
  await page.mouse.move(rect.x + 2, rect.y + 200)
  await page.mouse.down()
  await page.mouse.move(rect.x + 66, rect.y + 200, { steps: 12 })
  await page.mouse.up()
  await expect(resize).toHaveAttribute('aria-valuenow', '336')
  await resize.hover()
  rect = await resize.boundingBox()
  await page.mouse.move(rect.x + 2, rect.y + 200)
  await page.mouse.down()
  await page.mouse.move(rect.x + 42, rect.y + 200, { steps: 5 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(resize).toHaveAttribute('aria-valuenow', '336')
  await page.reload()
  await expect(resize).toHaveAttribute('aria-valuenow', '336', {
    timeout: 30000
  })
  await page
    .getByRole('button', { name: 'Customize sidebar', exact: true })
    .click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(settings).toBeVisible()
  assert.ok(page.url().includes('/dashboard'))
  await settings
    .getByRole('combobox', { name: 'Add a widget…' })
    .selectOption('upcomingEvents')
  await settings
    .getByRole('combobox', { name: 'Add a widget…' })
    .selectOption('focusTimer')
  await settings
    .getByRole('combobox', { name: 'Add a widget…' })
    .selectOption('ideaCapture')
  await settings
    .getByRole('combobox', { name: 'Add a widget…' })
    .selectOption('achievementHighlights')
  await settings.getByRole('switch', { name: 'Compact navigation' }).check()
  await page.screenshot({ path: `.temp/ux-settings-${engine}.png` })
  await page.keyboard.press('Escape')
  await expect(settings).toHaveCount(0)
  await expect(sidebar.locator('.monolith-sidebar-widget')).toHaveCount(4)
  await expect(
    sidebar.getByText('Design review', { exact: true })
  ).toBeVisible()
  await page.keyboard.press(
    engine === 'webkit' && process.platform === 'darwin'
      ? 'Meta+k'
      : 'Control+k'
  )
  const search = page.getByRole('dialog', { name: 'Search', exact: true })
  await expect(search).toBeVisible()
  await search
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('Launch')
  await expect(
    search.getByRole('option', { name: /Launch notes/ })
  ).toBeVisible()
  await search.getByRole('button', { name: 'Actions', exact: true }).click()
  await expect(
    search.getByRole('option', { name: /Launch Monolith/ })
  ).toBeVisible()
  await expect(
    search.getByRole('option', { name: /Launch notes/ })
  ).toHaveCount(0)
  await expect(
    search.getByRole('button', { name: 'Actions', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: `.temp/ux-search-${engine}.png` })
  await page.keyboard.press('Escape')
  await expect(search).toHaveCount(0)
  const source = sidebar
    .getByRole('link', { name: 'Research notebook', exact: true })
    .locator('..')
  const target = sidebar.getByRole('button', {
    name: 'Design studio',
    exact: true
  })
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  await target.hover()
  await page.evaluate(() => {
    window.__uxDrags = []
    for (const type of ['dragstart', 'dragover', 'drop', 'dragend'])
      document.addEventListener(
        type,
        event => {
          window.__uxDrags.push({
            type,
            x: event.clientX,
            y: event.clientY,
            target: event.target
              ?.closest('section')
              ?.getAttribute('aria-label'),
            types: [...event.dataTransfer.types],
            data:
              type === 'drop'
                ? event.dataTransfer.getData(
                    'application/x-monolith-navigation'
                  )
                : ''
          })
        },
        true
      )
  })
  const a = await source.boundingBox(),
    b = await target.boundingBox()
  await page.mouse.move(a.x + 50, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + 60, a.y + 18, { steps: 8 })
  await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 15 })
  await expect(page.locator('.monolith-native-drag-preview')).toBeVisible()
  await page.mouse.up()
  writeFileSync(
    `.temp/ux-drag-${engine}.json`,
    JSON.stringify(await page.evaluate(() => window.__uxDrags))
  )
  await expect
    .poll(
      async () =>
        (await request('workspaces/navigation', undefined, scope)).items.find(
          item => item.key === `page:${second.id}`
        )?.group
    )
    .toBe(groupId)
  await expect(
    sidebar
      .getByRole('region', { name: 'Design studio' })
      .getByRole('link', { name: 'Research notebook', exact: true })
  ).toBeVisible()
  const pageOptions = sidebar.getByRole('button', {
    name: 'Options for Launch notes',
    exact: true
  })
  await pageOptions.hover()
  await pageOptions.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page
    .getByRole('menuitem', { name: 'Archive page', exact: true })
    .click()
  await expect(
    sidebar.getByRole('link', { name: 'Launch notes', exact: true })
  ).toHaveCount(0)
  await expect(
    sidebar.getByRole('link', { name: 'Launch checklist', exact: true })
  ).toHaveCount(0)
  assert.ok(
    (await request('workspaces/getPage', undefined, { id: child.id })).page
  )
  await page.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(
    settings.getByText('Launch notes', { exact: true })
  ).toBeVisible()
  await settings.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(settings.getByText('Nothing archived yet')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    sidebar.getByRole('link', { name: 'Launch notes', exact: true })
  ).toBeVisible()
  await page.goto(
    `http://localhost:5173/databases?workspace=${space.id}&base=${base.id}&view=${view.id}`
  )
  const card = page
    .locator('.monolith-board-card')
    .filter({ hasText: 'Launch Monolith' })
  await expect(card).toBeVisible({ timeout: 30000 })
  assert.equal(
    await card.evaluate(element =>
      element.style.getPropertyValue('--record-color')
    ),
    '#518e97'
  )
  await page.getByRole('button', { name: 'View settings', exact: true }).click()
  await page.getByLabel('Color by', { exact: true }).selectOption('tags')
  await page.getByLabel('Color for Design', { exact: true }).fill('#8a70ac')
  await page.getByRole('button', { name: 'Save view', exact: true }).click()
  await expect
    .poll(
      async () =>
        (
          await request('workspaceDatabases/snapshot', undefined, scope)
        ).views.find(item => item.id === view.id).config.color.by
    )
    .toBe('tags')
  await expect(card).toBeVisible()
  await expect
    .poll(() =>
      card.evaluate(element => element.style.getPropertyValue('--record-color'))
    )
    .toBe('#8a70ac')
  await page.screenshot({ path: `.temp/ux-board-${engine}.png` })
  // Exercise the actual native drag path; synthetic drop events miss WebKit's
  // custom MIME stripping between dragstart and drop.
  const doneColumn = page.locator('.monolith-board-column').last()
  await card.hover()
  const cardBounds = await card.boundingBox()
  const columnBounds = await doneColumn.boundingBox()
  await page.mouse.move(cardBounds.x + 35, cardBounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(cardBounds.x + 48, cardBounds.y + 25, { steps: 8 })
  await page.mouse.move(columnBounds.x + 100, columnBounds.y + 60, {
    steps: 18
  })
  await page.mouse.up()
  await expect
    .poll(
      async () =>
        (
          await request('workspaceDatabases/snapshot', undefined, scope)
        ).records.find(item => item.id === task.id)?.done
    )
    .toBe(true)
  await page.goto(`http://localhost:5173/journal?workspace=${space.id}`)
  await expect(
    page.getByRole('heading', { name: 'Journal', exact: true })
  ).toBeVisible({ timeout: 30000 })
  await expect(
    page.getByRole('button', { name: journal.title, exact: true })
  ).toBeVisible()
  await expect(page.getByRole('img', { name: /entries/ })).toHaveCount(28)
  await page.goto(`http://localhost:5173/docs?workspace=${space.id}`)
  await expect(
    page.getByRole('button', { name: journal.title, exact: true })
  ).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await settings
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(
    settings.locator('xpath=ancestor::*[@data-modal-overlay]')
  ).toHaveCSS('opacity', '1')
  await page.screenshot({ path: `.temp/ux-settings-dark-${engine}.png` })
  await settings
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('light')
  await page.keyboard.press('Escape')
  const frames = await page.evaluate(
    () =>
      new Promise(resolve => {
        const gaps = []
        let before
        function tick(now) {
          if (before) gaps.push(now - before)
          before = now
          if (gaps.length < 60) requestAnimationFrame(tick)
          else {
            gaps.sort((a, b) => a - b)
            resolve({ median: gaps[30], p95: gaps[57], max: gaps[59] })
          }
        }
        requestAnimationFrame(tick)
      })
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: /Open sidebar|Toggle sidebar|Show sidebar/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(settings).toBeVisible()
  await expect(
    page.locator('[data-modal-overlay][data-modal-topmost="true"]')
  ).toHaveCSS('opacity', '1')
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  )
  await page.screenshot({ path: `.temp/ux-mobile-${engine}.png` })
  await page.keyboard.press('Escape')
  await expect(settings).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(settings).toBeVisible()
  assert.equal(
    await settings
      .locator('xpath=ancestor::*[contains(@class,"monolith-modal-surface")]')
      .evaluate(element => getComputedStyle(element).animationName),
    'none'
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(remoteIcons, [])
  writeFileSync(
    `.temp/ux-${engine}.json`,
    JSON.stringify(
      { workspace: space.id, passed: true, frames, errors, remoteIcons },
      null,
      2
    )
  )
  console.log(JSON.stringify({ engine, passed: true, frames }))
} catch (error) {
  writeFileSync(
    `.temp/ux-overlay-geometry-${engine}.json`,
    JSON.stringify(
      await page
        .locator(
          '[data-modal-overlay],.monolith-modal-surface,[data-workspace-overlay]'
        )
        .evaluateAll(elements =>
          elements.map(element => {
            const style = getComputedStyle(element)
            return {
              tag: element.tagName,
              className: element.className,
              rect: element.getBoundingClientRect().toJSON(),
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
              transform: style.transform,
              zIndex: style.zIndex
            }
          })
        ),
      null,
      2
    )
  )
  await page
    .screenshot({ path: `.temp/ux-failure-${engine}.png` })
    .catch(() => {})
  writeFileSync(
    `.temp/ux-failure-${engine}.txt`,
    (await page.locator('body').innerText()).slice(0, 25000)
  )
  console.error(
    error instanceof Error
      ? error.message.split('\n').slice(0, 4).join('\n')
      : String(error)
  )
  console.error('Browser errors:', errors)
  process.exitCode = 1
} finally {
  await browser.close()
}
